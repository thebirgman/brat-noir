(function () {
  // Placeholder texts for empty slots (matches build-a-gift-box style)
  const SLOT_PLACEHOLDERS = [
    { label: 'Start Your Stack', hint: 'Add 3 sets to unlock VIP Status.' },
    { label: 'Weekday Look', hint: "You're 2 sets away from Free Shipping." },
    { label: 'Unlock VIP', hint: 'Add this for Free Ship + VIP Pricing.' },
    { label: 'Weekend Look', hint: 'Get a luxury home for your nails next.' },
    { label: "Collector's Piece", hint: 'Velvet Box Unlocked.' }
  ];

  // Debounce helper to prevent rate limiting
  let refreshCartTimeout = null;
  let isRefreshingCart = false; // Flag to prevent concurrent refresh calls
  
  function debouncedRefreshCart(delay = 500) {
    if (refreshCartTimeout) {
      clearTimeout(refreshCartTimeout);
    }
    refreshCartTimeout = setTimeout(() => {
      refreshCart();
    }, delay);
  }

  async function addToCart(variantId, sellingPlanId, quantity, productData) {
    console.log('variantId:', variantId);
    console.log('sellingPlanId:', sellingPlanId);

    // Optimistically update bundle cart UI immediately
    if (productData) {
      optimisticallyAddToBundleCart(variantId, productData, quantity);
    }

    const item = {
      id: parseInt(variantId),
      quantity: quantity
    };

    if (sellingPlanId) {
      item.selling_plan = parseInt(sellingPlanId);
    }
    
    // Add to cart in background
    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [item]
        })
      });
      
      if (!response.ok) {
        console.warn('Add to cart failed:', response.status);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    }

    // Update bundle cart UI with real data and update cart drawer in background
    debouncedRefreshCart();
  }

  function optimisticallyAddToBundleCart(variantId, productData, quantity) {
    const template = document.querySelector('#bundle-cart-item');
    if (!template) return;

    const cartContainer = document.querySelector('.bundle-products__cart-items');
    if (!cartContainer) return;

    // Check if item already exists (for quantity updates)
    const existingItem = cartContainer.querySelector(`[data-remove-from-cart="${variantId}"]`)?.closest('.bundle-products__cart-item');
    if (existingItem) {
      // Update existing item quantity
      const titleElement = existingItem.querySelector('.bundle-products__cart-item-title');
      if (titleElement) {
        const currentQty = parseInt(titleElement.textContent.match(/x\s*(\d+)/)?.[1] || '1');
        const newQty = currentQty + quantity;
        titleElement.textContent = titleElement.textContent.replace(/x\s*\d+/, `x ${newQty}`);
      }
    } else {
      // Create and add new optimistic cart item
      const itemHtml = template.innerHTML
        .replace(/%ID%/g, variantId)
        .replace(/%TITLE%/g, productData.title)
        .replace(/%IMAGE%/g, productData.image || 'default-image-url.jpg')
        .replace(/%QUANTITY%/g, quantity);

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = itemHtml;
      const newItem = tempDiv.firstElementChild;
      
      // Add to the beginning of cart items
      cartContainer.insertBefore(newItem, cartContainer.firstChild);
    }

    // Optimistically update progress (total will be corrected by refreshCart)
    const progress = document.querySelector('.bundle-products__cart-progress-bar');
    if (progress) {
      const currentItems = cartContainer.querySelectorAll('.bundle-products__cart-item').length;
      const totalSteps = parseInt(progress.dataset.totalSteps) || 5; // Default to 5 if not set
      progress.style.setProperty('--progress', (currentItems / totalSteps) * 100 + '%');
    }
  }

  function fillSlot(slot, item) {
    const placeholder = slot.querySelector('.bundle-products__cart-item-placeholder');
    if (placeholder) placeholder.classList.add('hidden');
    let img = slot.querySelector('.bundle-products__cart-item-image');
    if (!img) {
      img = document.createElement('img');
      img.className = 'bundle-products__cart-item-image';
      const details = slot.querySelector('.bundle-products__cart-item-details');
      slot.insertBefore(img, details);
    }
    img.src = item.image || '';
    img.alt = item.product_title || '';
    img.style.display = '';
    const details = slot.querySelector('.bundle-products__cart-item-details');
    if (details) {
      let collectionEl = details.querySelector('.bundle-products__cart-item-collection');
      const titleEl = details.querySelector('.bundle-products__cart-item-title');
      const hintEl = details.querySelector('.bundle-products__cart-item-hint');
      if (!collectionEl && titleEl) {
        collectionEl = document.createElement('span');
        collectionEl.className = 'bundle-products__cart-item-collection';
        details.insertBefore(collectionEl, titleEl);
      }
      if (collectionEl) {
        collectionEl.textContent = item.collection_title || '';
        collectionEl.style.display = item.collection_title ? '' : 'none';
      }
      if (titleEl) titleEl.textContent = (item.product_title || '') + ' x ' + (item.quantity || 1);
      if (hintEl) hintEl.style.display = 'none';
    }
    const removeBtn = slot.querySelector('.bundle-products__cart-item-remove');
    if (removeBtn) {
      removeBtn.style.display = '';
      removeBtn.setAttribute('data-remove-from-cart', item.variant_id);
      removeBtn.removeAttribute('aria-hidden');
    }
    slot.dataset.filled = 'true';
  }

  function resetSlotToPlaceholder(slot, slotNumber) {
    const placeholder = slot.querySelector('.bundle-products__cart-item-placeholder');
    if (placeholder) placeholder.classList.remove('hidden');
    const img = slot.querySelector('.bundle-products__cart-item-image');
    if (img) img.style.display = 'none';
    const config = SLOT_PLACEHOLDERS[slotNumber - 1];
    const details = slot.querySelector('.bundle-products__cart-item-details');
    if (details && config) {
      const titleEl = details.querySelector('.bundle-products__cart-item-title');
      let hintEl = details.querySelector('.bundle-products__cart-item-hint');
      if (!hintEl && titleEl) {
        hintEl = document.createElement('span');
        hintEl.className = 'bundle-products__cart-item-hint';
        details.appendChild(hintEl);
      }
      if (titleEl) titleEl.textContent = config.label;
      if (hintEl) {
        hintEl.textContent = config.hint;
        hintEl.style.display = '';
      }
      const collectionEl = details.querySelector('.bundle-products__cart-item-collection');
      if (collectionEl) collectionEl.style.display = 'none';
    }
    const removeBtn = slot.querySelector('.bundle-products__cart-item-remove');
    if (removeBtn) {
      removeBtn.style.display = 'none';
      removeBtn.removeAttribute('data-remove-from-cart');
      removeBtn.setAttribute('aria-hidden', 'true');
    }
    delete slot.dataset.filled;
  }

  async function removeFromCart(variantId) {
    // Optimistically remove from bundle cart UI immediately
    const cartContainer = document.querySelector('.bundle-products__cart-items');
    if (cartContainer) {
      const itemToRemove = cartContainer.querySelector(`[data-remove-from-cart="${variantId}"]`)?.closest('.bundle-products__cart-item');
      if (itemToRemove) {
        itemToRemove.remove();
      }
    }

    try {
      const response = await fetch(`/cart/change.js`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: variantId,
          quantity: 0
        })
      });
      
      if (!response.ok) {
        console.warn('Remove from cart failed:', response.status);
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
    }

    // Update bundle cart UI with real data and update cart drawer in background
    debouncedRefreshCart();
  }

  async function refreshCart() {
    try {
      const response = await fetch('/cart.js');
      
      if (!response.ok) {
        console.warn('Cart fetch failed with status:', response.status);
        return null;
      }
      
      const data = await response.json();
      
      console.log('Cart data:', data);
      const template = document.querySelector('#bundle-cart-item');

    // Check for products with special tags (trio-bundle or collection) and get compare_at_price
    let hasSpecialTag = false;
    const itemCompareAtPrices = new Map(); // Store variant_id -> compare_at_price
    
    if (data.items && data.items.length > 0) {
      // Fetch product data to check tags and get compare_at_price
      const productChecks = data.items.map(async (item) => {
        try {
          // Extract product handle from URL if available, or use product_id as fallback
          let productHandle = item.handle;
          if (!productHandle && item.url) {
            // Extract handle from URL like /products/handle or /products/handle?variant=...
            const urlMatch = item.url.match(/\/products\/([^\/\?]+)/);
            if (urlMatch) {
              productHandle = urlMatch[1];
            }
          }
          
          if (productHandle) {
            const productResponse = await fetch(`/products/${productHandle}.js`);
            if (productResponse.ok) {
              const productData = await productResponse.json();
              
              // Get compare_at_price for the specific variant
              if (productData.variants) {
                const variant = productData.variants.find(v => v.id === item.variant_id);
                if (variant && variant.compare_at_price) {
                  itemCompareAtPrices.set(item.variant_id, variant.compare_at_price);
                }
              }
              
              // Check for special tags
              if (productData.tags) {
                const tags = Array.isArray(productData.tags) ? productData.tags : productData.tags.split(',');
                return tags.some(tag => 
                  tag.trim().toLowerCase() === 'trio-bundle' || 
                  tag.trim().toLowerCase() === 'collection'
                );
              }
            }
          }
        } catch (e) {
          console.warn('Could not fetch product data for item:', item.product_id);
        }
        return false;
      });
      
      const tagResults = await Promise.all(productChecks);
      hasSpecialTag = tagResults.some(result => result === true);
    }

    let html = '';
    data.items.forEach(item => {
      const itemHtml = template.innerHTML
        .replace(/%ID%/g, item.variant_id)
        .replace(/%TITLE%/g, item.product_title)
        .replace(/%IMAGE%/g, item.image || 'default-image-url.jpg')
        .replace(/%QUANTITY%/g, item.quantity);
      html += itemHtml;
    });

    const cartContainer = document.querySelector('.bundle-products__cart-items');
    if (cartContainer) cartContainer.innerHTML = html;

    const total = document.querySelector('.bundle-products__cart-total-price');
    if (total) total.innerHTML = '$' + ((data.total_price || 0) / 100);

    // Calculate total saved amount (discounts + compare_at_price savings)
    let totalSaved = data.total_discount || 0;
    if (data.items && data.items.length > 0) {
      data.items.forEach(item => {
        // Get compare_at_price from the map we populated earlier
        const compareAtPrice = itemCompareAtPrices.get(item.variant_id);
        if (compareAtPrice && compareAtPrice > item.final_price) {
          const finalPrice = item.final_price;
          const quantity = item.quantity || 1;
          const savingsPerItem = compareAtPrice - finalPrice;
          totalSaved += savingsPerItem * quantity;
        }
      });
    }

    const savedAmount = document.querySelector('span.saved-amount');
    if (savedAmount) {
      savedAmount.textContent = '$' + (totalSaved / 100).toFixed(2);
    }

    const progress = document.querySelector('.bundle-products__cart-progress-bar');
    if (progress) {
      const totalSteps = parseInt(progress.dataset.totalSteps) || 5; // Default to 5 if not set
      // Mark complete if totalSteps+ items OR has special tag
      if (data.item_count >= totalSteps || hasSpecialTag) {
        progress.style.setProperty('--progress', '100%');
      } else {
        progress.style.setProperty('--progress', (data.item_count / totalSteps) * 100 + '%');
      }
    }

    const remaining = document.querySelector('.bundle-products__cart-progress-text');
    if (remaining) {
      const progressBar = document.querySelector('.bundle-products__cart-progress-bar');
      const totalSteps = progressBar ? (parseInt(progressBar.dataset.totalSteps) || 5) : 5;
      const itemCount = data.item_count;
      const remainingCount = totalSteps - itemCount;
      let progressText = '';
      
      // Get text templates from data attributes
      const textDefault = remaining.dataset.progressTextDefault || 'You are [X] sets away from 20% OFF';
      const textTwoMore = remaining.dataset.progressTextTwoMore || 'Just 2 more sets to unlock 20% OFF';
      const textOneMore = remaining.dataset.progressTextOneMore || 'Just 1 more set to unlock 20% OFF';
      const textComplete = remaining.dataset.progressTextComplete || 'We love to see it. 20% OFF applied.';
      
      // Apply conditional logic matching the Liquid template
      if (itemCount >= totalSteps || hasSpecialTag) {
        progressText = textComplete;
      } else if (itemCount === totalSteps - 1) {
        progressText = textOneMore;
      } else if (itemCount === totalSteps - 2) {
        progressText = textTwoMore;
      } else {
        // Replace [X] with remaining count
        progressText = textDefault.replace('[X]', remainingCount);
      }
      
      remaining.innerHTML = progressText;
    }
    
    // Sync quantity selectors with cart state
    const allProductCards = document.querySelectorAll('.bundle-product__card');
    const cartVariantIds = new Map();
    
    if (data.items && data.items.length > 0) {
      data.items.forEach(item => {
        cartVariantIds.set(item.variant_id.toString(), item.quantity);
      });
    }
    
    allProductCards.forEach(card => {
      const variantIdAttr = card.querySelector('[data-variant-id]')?.getAttribute('data-variant-id');
      if (!variantIdAttr) return;
      
      const quantityInCart = cartVariantIds.get(variantIdAttr);
      const quantityWrapper = card.querySelector('.bundle-product__quantity-wrapper');
      const atcButton = card.querySelector('.bundle-product__atc');
      
      if (quantityInCart && quantityInCart > 0) {
        // Item is in cart - show quantity selector
        card.classList.add('added');
        if (quantityWrapper && atcButton) {
          atcButton.style.display = 'none';
          quantityWrapper.style.display = 'flex';
          const quantityInput = quantityWrapper.querySelector('.bundle-product__quantity-input');
          if (quantityInput) {
            quantityInput.value = quantityInCart;
          }
        }
      } else {
        // Item is not in cart - show button
        card.classList.remove('added');
        if (quantityWrapper && atcButton) {
          quantityWrapper.style.display = 'none';
          atcButton.style.display = 'flex';
        }
      }
    });
    
    // Return cart data for use in updating theme's cart drawer
    return data;
    } catch (error) {
      console.error('Error refreshing cart:', error);
      return null;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const addToCartButtons = document.querySelectorAll('[data-add-to-cart]');
    addToCartButtons.forEach(button => {
      button.addEventListener('click', async () => {
        button.classList.add('loading');

        const variantId = button.getAttribute('data-variant-id') || null;
        const sellingPlanID = button.getAttribute('data-selling-plan') || null;

        // Get product data from the card for optimistic update
        const card = button.closest('.bundle-product__card');
        const productData = card ? {
          title: card.querySelector('.bundle-product__title')?.textContent?.trim() || '',
          image: card.querySelector('.bundle-product__image')?.src || '',
          price: card.querySelector('.bundle-product__price--sale, .bundle-product__price--regular')?.textContent || '0'
        } : null;

        // Add visual feedback class to product card and show quantity selector
        if (card) {
          card.classList.add('added', 'is-added-to-box');
          
          // Show quantity selector and hide button
          const quantityWrapper = card.querySelector('.bundle-product__quantity-wrapper');
          const atcButton = card.querySelector('.bundle-product__atc');
          
          if (quantityWrapper && atcButton) {
            atcButton.style.display = 'none';
            quantityWrapper.style.display = 'flex';
            
            // Set initial quantity to 1
            const quantityInput = quantityWrapper.querySelector('.bundle-product__quantity-input');
            if (quantityInput) {
              quantityInput.value = '1';
            }
          }
          
          // Remove the temporary is-added-to-box class after 2 seconds (keep 'added' class)
          setTimeout(() => {
            card.classList.remove('is-added-to-box');
          }, 2000);
        }

        // Don't await - let it run in background after optimistic update
        addToCart(variantId, 0, 1, productData).then(() => {
          button.classList.remove('loading');
        }).catch(() => {
          button.classList.remove('loading');
          // If add fails, refresh cart to show correct state
          debouncedRefreshCart();
        });
      });
    });

    document.addEventListener('click', async (event) => {
      let button = event.target;
      if (!button.matches('[data-remove-from-cart]')) {
        button = event.target.closest('[data-remove-from-cart]');
      }

      if (button) {
        button.classList.add('loading');
        const variantId = button.dataset.removeFromCart;
        // Don't await - let it run in background after optimistic update
        removeFromCart(variantId).then(() => {
          button.classList.remove('loading');
        }).catch(() => {
          button.classList.remove('loading');
          // If remove fails, refresh cart to show correct state
          debouncedRefreshCart();
        });
      }
    });

    // Handle quantity changes in bundle product cards
    document.addEventListener('click', async (event) => {
      const decreaseBtn = event.target.closest('[data-decrease-quantity]');
      const increaseBtn = event.target.closest('[data-increase-quantity]');
      
      if (decreaseBtn || increaseBtn) {
        const quantityWrapper = (decreaseBtn || increaseBtn).closest('.bundle-product__quantity-wrapper');
        if (!quantityWrapper) return;
        
        const quantityInput = quantityWrapper.querySelector('.bundle-product__quantity-input');
        const card = quantityWrapper.closest('.bundle-product__card');
        if (!quantityInput || !card) return;
        
        // Get variant ID from input or fallback to button's data attribute
        let variantId = quantityInput.getAttribute('data-variant-id');
        if (!variantId) {
          const addButton = card.querySelector('[data-add-to-cart]');
          variantId = addButton?.getAttribute('data-variant-id');
        }
        
        if (!variantId) {
          console.error('No variant ID found for quantity change');
          return;
        }
        
        const sellingPlanID = card.querySelector('[data-selling-plan]')?.getAttribute('data-selling-plan') || null;
        
        let currentQuantity = parseInt(quantityInput.value) || 1;
        
        if (decreaseBtn) {
          if (currentQuantity > 1) {
            currentQuantity--;
            quantityInput.value = currentQuantity;
            
            // Update cart - set new quantity
            try {
              const response = await fetch('/cart/change.js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: variantId,
                  quantity: currentQuantity
                })
              });
              
              if (!response.ok) {
                console.warn('Cart change failed:', response.status);
              }
            } catch (error) {
              console.error('Error changing cart:', error);
            }
            
            debouncedRefreshCart();
          } else {
            // Remove from cart if quantity becomes 0
            await removeFromCart(variantId);
            
            // Hide quantity selector and show button
            quantityWrapper.style.display = 'none';
            const atcButton = card.querySelector('.bundle-product__atc');
            if (atcButton) {
              atcButton.style.display = 'flex';
            }
            
            // Remove added class
            card.classList.remove('added');
          }
        } else if (increaseBtn) {
          currentQuantity++;
          quantityInput.value = currentQuantity;
          
          // Add one more to cart using /cart/add.js
          const item = {
            id: parseInt(variantId),
            quantity: 1
          };
          
          if (sellingPlanID) {
            item.selling_plan = parseInt(sellingPlanID);
          }
          
          try {
            const response = await fetch('/cart/add.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: [item] })
            });
            
            if (!response.ok) {
              console.warn('Cart add failed:', response.status);
            }
          } catch (error) {
            console.error('Error adding to cart:', error);
          }
          
          debouncedRefreshCart();
        }
      }
    });
    
    // Handle direct input changes
    document.addEventListener('change', async (event) => {
      const quantityInput = event.target.closest('.bundle-product__quantity-input');
      if (!quantityInput || !quantityInput.closest('.bundle-product__quantity-wrapper')) return;
      
      const card = quantityInput.closest('.bundle-product__card');
      if (!card) return;
      
      // Get variant ID from input or fallback to button's data attribute
      let variantId = quantityInput.getAttribute('data-variant-id');
      if (!variantId) {
        const addButton = card.querySelector('[data-add-to-cart]');
        variantId = addButton?.getAttribute('data-variant-id');
      }
      
      if (!variantId) {
        console.error('No variant ID found for quantity change');
        return;
      }
      
      let newQuantity = parseInt(quantityInput.value);
      
      if (isNaN(newQuantity) || newQuantity < 0) {
        newQuantity = 1;
        quantityInput.value = 1;
      }
      
      if (newQuantity === 0) {
        await removeFromCart(variantId);
        const quantityWrapper = quantityInput.closest('.bundle-product__quantity-wrapper');
        const atcButton = card.querySelector('.bundle-product__atc');
        if (quantityWrapper && atcButton) {
          quantityWrapper.style.display = 'none';
          atcButton.style.display = 'flex';
        }
        card.classList.remove('added');
      } else {
        // Set absolute quantity in cart
        try {
          const response = await fetch('/cart/change.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: variantId,
              quantity: newQuantity
            })
          });
          
          if (!response.ok) {
            console.warn('Cart change failed:', response.status);
          }
        } catch (error) {
          console.error('Error changing cart:', error);
        }
        debouncedRefreshCart();
      }
    });

    refreshCart();
  });

  function handleCartChange() {
    debouncedRefreshCart(300);
  }

  // 1️⃣ Shopify / theme cart events (documented + common)
  document.addEventListener('cart:updated', handleCartChange);
  document.addEventListener('theme:cart:change', handleCartChange);

  // 2️⃣ Fallback: after any add-to-cart form submit
  document.addEventListener('submit', function (event) {
    const form = event.target;

    if (
      form?.action?.includes('/cart/add')
    ) {
      // Wait for Shopify to finish adding
      setTimeout(handleCartChange, 300);
    }
  });
})();

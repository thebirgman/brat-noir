(function () {
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
    await fetch('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [item]
      })
    });

    // Update bundle cart UI with real data and update cart drawer in background
    refreshCart().then(cartData => {
      // Update theme's cart drawer in background (non-blocking)
      if (cartData) {
        document.dispatchEvent(new CustomEvent('theme:cart:change', {
          detail: {
            cart: cartData
          },
          bubbles: true
        }));
      }
    });
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
      progress.style.setProperty('--progress', (currentItems / 3) * 100 + '%');
    }
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

    await fetch(`/cart/change.js`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: variantId,
        quantity: 0
      })
    });

    // Update bundle cart UI with real data and update cart drawer in background
    refreshCart().then(cartData => {
      // Update theme's cart drawer in background (non-blocking)
      if (cartData) {
        document.dispatchEvent(new CustomEvent('theme:cart:change', {
          detail: {
            cart: cartData
          },
          bubbles: true
        }));
      }
    });
  }

  async function refreshCart() {
    const response = await fetch('/cart.js');
    const data = await response.json();
    
    console.log('Cart data:', data);
    const template = document.querySelector('#bundle-cart-item');

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

    const progress = document.querySelector('.bundle-products__cart-progress-bar');
    if (progress) progress.style.setProperty('--progress', (data.item_count / 3) * 100 + '%');

    const remaining = document.querySelector('.bundle-products__cart-progress-text');
    if (remaining) {
      const itemCount = data.item_count;
      const remainingCount = 3 - itemCount;
      let progressText = '';
      
      // Get text templates from data attributes
      const textDefault = remaining.dataset.progressTextDefault || 'You are [X] sets away from 20% OFF';
      const textTwoMore = remaining.dataset.progressTextTwoMore || 'Just 2 more sets to unlock 20% OFF';
      const textOneMore = remaining.dataset.progressTextOneMore || 'Just 1 more set to unlock 20% OFF';
      const textComplete = remaining.dataset.progressTextComplete || 'We love to see it. 20% OFF applied.';
      
      // Apply conditional logic matching the Liquid template
      if (itemCount >= 3) {
        progressText = textComplete;
      } else if (itemCount === 2) {
        progressText = textOneMore;
      } else if (itemCount === 1) {
        progressText = textTwoMore;
      } else {
        // Replace [X] with remaining count
        progressText = textDefault.replace('[X]', remainingCount);
      }
      
      remaining.innerHTML = progressText;
    }
    
    // Return cart data for use in updating theme's cart drawer
    return data;
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

        // Don't await - let it run in background after optimistic update
        addToCart(variantId, 0, 1, productData).then(() => {
          button.classList.remove('loading');
        }).catch(() => {
          button.classList.remove('loading');
          // If add fails, refresh cart to show correct state
          refreshCart();
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
          refreshCart();
        });
      }
    });

    refreshCart();
  });

  function handleCartChange() {
    if (typeof refreshCart === 'function') {
      refreshCart();
    }
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

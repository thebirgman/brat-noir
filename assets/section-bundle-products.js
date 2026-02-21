(function () {
  /**
   * Get the selling plan ID to use when adding to cart, based on the ritual dropdown.
   * First dropdown option = index 1 = first selling plan in product.
   * @param {HTMLElement} card - .bundle-product__card
   * @returns {number|null} selling plan id or null
   */
  function getSellingPlanIdFromRitual(card) {
    if (!card) return null;
    const section = card.closest('.bundle-products');
    const select = section?.querySelector('[data-ritual-select]');
    const addBtn = card.querySelector('[data-add-to-cart]');
    const idsJson = addBtn?.getAttribute('data-selling-plan-ids');
    // When no ritual dropdown (or no plan ids): use button's data-selling-plan (first plan)
    if (!addBtn || !select || !idsJson) {
      const fallback = addBtn?.getAttribute('data-selling-plan') || null;
      if (typeof console !== 'undefined' && console.log) {
        console.log('[Bundle ATC] getSellingPlanIdFromRitual: using fallback data-selling-plan:', fallback);
      }
      return fallback;
    }
    let ids = [];
    try {
      ids = JSON.parse(idsJson);
    } catch (e) {
      return addBtn.getAttribute('data-selling-plan') || null;
    }
    if (!Array.isArray(ids) || ids.length === 0) return addBtn.getAttribute('data-selling-plan') || null;
    const ritualIndex = parseInt(select.value, 10) || 1;
    const oneBased = Math.max(1, Math.min(ritualIndex, ids.length));
    return ids[oneBased - 1] || null;
  }

  // Placeholder texts for empty slots (matches build-a-gift-box style)
  if(window.location.href.includes('brat-club')){
var SLOT_PLACEHOLDERS = [
    { label: 'Start Your Stack', hint: 'Unlocks Free Shipping instantly.' },
    { label: 'Switch It Up', hint: "You are 2 sets away from your Free Gift." },
    { label: 'Unlock Your Freebie', hint: 'Add this set to unlock your Free Set instantly.' },
    { label: 'Free Set :)', hint: 'You earned it. This set is on us ($18 Value)' },
    { label: "Unlock Velvet Status", hint: 'Add to get $10 Off + The Velvet Box.' }
  ];
  }
  else{
var SLOT_PLACEHOLDERS = [
    { label: 'Start Your Stack', hint: 'Add 3 sets to unlock VIP Status.' },
    { label: 'Weekday Look', hint: "You're 2 sets away from Free Shipping." },
    { label: 'Unlock VIP', hint: 'Add this for Free Ship + VIP Pricing.' },
    { label: 'Weekend Look', hint: 'Get a luxury home for your nails next.' },
    { label: "Collector's Piece", hint: 'Velvet Box Unlocked.' }
  ];
  }
  

  /**
   * Update progress step icons: show completed icon when progress has reached that step.
   * @param {HTMLElement} progressBar - .bundle-products__cart-progress-bar
   * @param {number} effectiveItemCount - Current progress (items or effective steps)
   * @param {number} totalSteps - Total steps (default 5)
   */
  function updateProgressStepIcons(progressBar, effectiveItemCount, totalSteps) {
    if (!progressBar) return;
    const steps = progressBar.querySelectorAll('.bundle-products__cart-progress-step');
    steps.forEach(function (step) {
      const stepNum = parseInt(step.dataset.step, 10);
      if (isNaN(stepNum)) return;
      const img = step.querySelector('img');
      if (!img) return;
      const defaultSrc = step.dataset.icon;
      const completedSrc = step.dataset.iconCompleted || '';
      const isReached = effectiveItemCount >= stepNum;
      img.src = (isReached && completedSrc) ? completedSrc : (defaultSrc || img.src);
    });
  }

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
    const item = {
      id: parseInt(variantId),
      quantity: quantity
    };
    if (sellingPlanId) {
      item.selling_plan = parseInt(sellingPlanId);
    }
    console.log('[Bundle ATC] addToCart payload:', JSON.stringify({ items: [item] }));

    // Optimistically update bundle cart UI immediately
    if (productData) {
      optimisticallyAddToBundleCart(variantId, productData, quantity);
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

      const responseData = await response.json().catch(function () { return null; });
      if (!response.ok) {
        console.warn('[Bundle ATC] Add to cart failed:', response.status, responseData);
      } else {
        console.log('[Bundle ATC] Add to cart success:', responseData);
      }
    } catch (error) {
      console.error('[Bundle ATC] Error adding to cart:', error);
    }

    // Update bundle cart UI with real data and update cart drawer in background
    debouncedRefreshCart();
  }

  function optimisticallyAddToBundleCart(variantId, productData, quantity) {
    const cartContainer = document.querySelector('.bundle-products__cart-items');
    if (!cartContainer) return;

    const slots = Array.from(cartContainer.querySelectorAll('.bundle-products__cart-item')).sort(
      (a, b) => parseInt(a.dataset.slot, 10) - parseInt(b.dataset.slot, 10)
    );

    // Each product = 1 slot; never combine same product into one slot
    const emptySlot = slots.find(s => !s.dataset.filled);
    if (emptySlot) {
      fillSlot(emptySlot, {
        variant_id: variantId,
        product_title: productData.title || '',
        image: productData.image || '',
        quantity: 1,
        collection_title: productData.collection || ''
      });
    }

    // Optimistically update progress (total will be corrected by refreshCart)
    const progress = document.querySelector('.bundle-products__cart-progress-bar');
    if (progress) {
      const filledCount = cartContainer.querySelectorAll('.bundle-products__cart-item[data-filled="true"]').length;
      const totalSteps = parseInt(progress.dataset.totalSteps) || 5;
      progress.style.setProperty('--progress', (filledCount / totalSteps) * 100 + '%');
      updateProgressStepIcons(progress, filledCount, totalSteps);
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
    const config = SLOT_PLACEHOLDERS[(slotNumber - 1) % SLOT_PLACEHOLDERS.length];
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
    slot.classList.remove('bundle-products__cart-item--trio-bundle', 'bundle-products__cart-item--collection', 'bundle-products__cart-item--duplicate');
    delete slot.dataset.filled;
  }

  async function removeFromCart(variantId) {
    // Optimistically reset this slot to placeholder
    const cartContainer = document.querySelector('.bundle-products__cart-items');
    if (cartContainer) {
      const slot = cartContainer.querySelector(`[data-remove-from-cart="${variantId}"]`)?.closest('.bundle-products__cart-item');
      if (slot && slot.dataset.slot) {
        resetSlotToPlaceholder(slot, parseInt(slot.dataset.slot, 10));
      }
    }

    try {
      // Each product = 1 slot: decrease quantity by 1 (remove line only when qty was 1)
      const cartRes = await fetch('/cart.js');
      if (!cartRes.ok) {
        debouncedRefreshCart();
        return;
      }
      const cartData = await cartRes.json();
      const line = (cartData.items || []).find(function (item) { return String(item.variant_id) === String(variantId); });
      const newQuantity = line ? Math.max(0, (line.quantity || 1) - 1) : 0;
      const lineId = line && line.key ? line.key : variantId;

      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: lineId,
          quantity: newQuantity
        })
      });

      if (!response.ok) {
        console.warn('Remove from cart failed:', response.status);
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
    }

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

    // Check for products with special tags (trio-bundle = 3 products worth, collection = 5 products worth), compare_at_price, and collection title
    const itemEffectiveSteps = []; // Per-item: 3 for trio-bundle, 5 for collection, 1 otherwise
    let tagResults = []; // Per-item: { effectiveSteps, tag: 'trio-bundle'|'collection'|null }
    const itemCompareAtPrices = new Map(); // Store variant_id -> compare_at_price
    const itemCollectionTitles = new Map(); // Store variant_id -> collection title (for display above product title)
    
    if (data.items && data.items.length > 0) {
      // Fetch product data to check tags, get compare_at_price, and collection for each item
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
              
              // Get collection title (first collection or metafield, for display above product title)
              const collectionTitle = (productData.collections && productData.collections[0] && (productData.collections[0].title || productData.collections[0].name)) ||
                (productData.metafields && productData.metafields.custom && productData.metafields.custom.collection_name && (typeof productData.metafields.custom.collection_name === 'string' ? productData.metafields.custom.collection_name : productData.metafields.custom.collection_name.value)) ||
                '';
              if (collectionTitle) {
                itemCollectionTitles.set(item.variant_id, collectionTitle);
              }
              
              // Check for special tags: trio-bundle = 3 products worth (e.g. 60%), collection = 5 products worth (100%)
              if (productData.tags) {
                const tags = Array.isArray(productData.tags) ? productData.tags : productData.tags.split(',');
                const normalized = tags.map(t => t.trim().toLowerCase());
                if (normalized.includes('collection')) return { effectiveSteps: 5, tag: 'collection' };
                if (normalized.includes('trio-bundle')) return { effectiveSteps: 3, tag: 'trio-bundle' };
              }
            }
          }
        } catch (e) {
          console.warn('Could not fetch product data for item:', item.product_id);
        }
        return { effectiveSteps: 1, tag: null };
      });
      
      tagResults = await Promise.all(productChecks);
      itemEffectiveSteps.push(...tagResults.map(r => r.effectiveSteps));
    }

    // Filter items by subscription / non-subscription when section settings are set (only when exactly one option is on)
    const section = document.querySelector('.bundle-products');
    const subscriptionOnly = section?.dataset?.cartSubscriptionOnly === 'true';
    const nonSubscriptionOnly = section?.dataset?.cartNonSubscriptionOnly === 'true';
    let displayItems = data.items || [];
    let tagResultsDisplay = tagResults;
    let itemEffectiveStepsDisplay = itemEffectiveSteps;
    if (subscriptionOnly && !nonSubscriptionOnly && data.items && data.items.length > 0) {
      const indices = data.items.map(function (item, i) { return !!(item.selling_plan_allocation) ? i : -1; }).filter(function (i) { return i >= 0; });
      displayItems = indices.map(function (i) { return data.items[i]; });
      tagResultsDisplay = indices.map(function (i) { return tagResults[i]; });
      itemEffectiveStepsDisplay = tagResultsDisplay.map(function (r, i) {
  const item = displayItems[i];
  const qty = item?.quantity || 1;

  // Tagged bundles count as fixed total steps
  if (r.tag === 'trio-bundle' || r.tag === 'collection') {
    return r.effectiveSteps;
  }

  // Normal items count per quantity
  return r.effectiveSteps * qty;
});
    } else if (nonSubscriptionOnly && !subscriptionOnly && data.items && data.items.length > 0) {
      const indices = data.items.map(function (item, i) { return !item.selling_plan_allocation ? i : -1; }).filter(function (i) { return i >= 0; });
      displayItems = indices.map(function (i) { return data.items[i]; });
      tagResultsDisplay = indices.map(function (i) { return tagResults[i]; });
      itemEffectiveStepsDisplay = tagResultsDisplay.map(function (r, i) {
  const item = displayItems[i];
  const qty = item?.quantity || 1;

  // Tagged bundles count as fixed total steps
  if (r.tag === 'trio-bundle' || r.tag === 'collection') {
    return r.effectiveSteps;
  }

  // Normal items count per quantity
  return r.effectiveSteps * qty;
});
    }

    const cartContainer = document.querySelector('.bundle-products__cart-items');
    if (cartContainer) {
      const slots = Array.from(cartContainer.querySelectorAll('.bundle-products__cart-item')).sort(
        (a, b) => parseInt(a.dataset.slot, 10) - parseInt(b.dataset.slot, 10)
      );
      const slotCount = slots.length;
      // Each product = 1 slot: normal item qty 3 = 3 slots; trio = 3 slots; collection = 5 slots (use displayItems for subscription filter)
      const slotAssignments = new Array(slotCount).fill(null);
      if (displayItems.length > 0 && tagResultsDisplay.length === displayItems.length) {
        let slotIndex = 0;
        for (let i = 0; i < displayItems.length && slotIndex < slotCount; i++) {
          const item = displayItems[i];
          const effectiveSteps = tagResultsDisplay[i].effectiveSteps;
          const tag = tagResultsDisplay[i].tag;
          const collection_title = itemCollectionTitles.get(item.variant_id) || '';
          const slotsForItem = tag ? effectiveSteps : (item.quantity || 1);
          for (let j = 0; j < slotsForItem && slotIndex < slotCount; j++) {
            const isDuplicate = j > 0;
            slotAssignments[slotIndex] = { ...item, quantity: 1, tag, collection_title, product_title: item.product_title || item.title || '', isDuplicate };
            slotIndex++;
          }
        }
      }
      for (let i = 0; i < slotCount; i++) {
        const slot = slots[i];
        if (!slot) continue;
        const slotNumber = i + 1;
        const assignment = slotAssignments[i];
        slot.classList.remove('bundle-products__cart-item--trio-bundle', 'bundle-products__cart-item--collection', 'bundle-products__cart-item--duplicate');
        if (assignment) {
          if (assignment.tag) slot.classList.add('bundle-products__cart-item--' + assignment.tag);
          if (assignment.isDuplicate) slot.classList.add('bundle-products__cart-item--duplicate');
          fillSlot(slot, assignment);
        } else {
          resetSlotToPlaceholder(slot, slotNumber);
        }
      }
    }

    const total = document.querySelector('.bundle-products__cart-total-price');
    if (total) total.innerHTML = '$' + ((data.total_price || 0) / 100);

    // Calculate total saved amount (discounts + compare_at_price savings + $3 per subscription product)
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
        // Subscription: $3 saved per product
        if (item.selling_plan_allocation) {
          const quantity = item.quantity || 1;
          totalSaved += 300 * quantity;
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
      // Effective count: trio-bundle = 3, collection = 5, else 1 per item (use filtered list when subscription/non-subscription only)
      const effectiveItemCount = itemEffectiveStepsDisplay.length
        ? itemEffectiveStepsDisplay.reduce((sum, n) => sum + n, 0)
        : displayItems.length;
      const progressPct = Math.min(100, (effectiveItemCount / totalSteps) * 100);
      progress.style.setProperty('--progress', progressPct + '%');
      updateProgressStepIcons(progress, effectiveItemCount, totalSteps);
    }

    const remaining = document.querySelector('.bundle-products__cart-progress-text');
    if (remaining) {
      const progressBar = document.querySelector('.bundle-products__cart-progress-bar');
      const totalSteps = parseInt(remaining.dataset.totalSteps || progressBar?.dataset?.totalSteps || '5', 10) || 5;
      const effectiveItemCount = itemEffectiveStepsDisplay.length
        ? itemEffectiveStepsDisplay.reduce((sum, n) => sum + n, 0)
        : displayItems.length;
      const remainingCount = Math.max(0, totalSteps - effectiveItemCount);
      let progressText = '';

      // Get step text templates from data attributes (0–5) - use getAttribute for reliable access
      // (dataset can mis-handle attributes like data-progress-text-step-0 due to hyphen-digit)
      const textStep0 = remaining.getAttribute('data-progress-text-step-0') ?? 'You are [X] sets away from 20% OFF';
      const textStep1 = remaining.getAttribute('data-progress-text-step-1') ?? 'You are [X] sets away from 20% OFF';
      const textStep2 = remaining.getAttribute('data-progress-text-step-2') ?? 'You are [X] sets away from 20% OFF';
      const textStep3 = remaining.getAttribute('data-progress-text-step-3') ?? 'Just 2 more sets to unlock 20% OFF';
      const textStep4 = remaining.getAttribute('data-progress-text-step-4') ?? 'Just 1 more set to unlock 20% OFF';
      const textStep5 = remaining.getAttribute('data-progress-text-step-5') ?? 'We love to see it. 20% OFF applied.';

      // Apply step-based logic (effective count: trio-bundle = 3, collection = 5)
      if (effectiveItemCount >= totalSteps) {
        progressText = textStep5;
      } else if (effectiveItemCount === totalSteps - 1) {
        progressText = textStep4;
      } else if (effectiveItemCount === totalSteps - 2) {
        progressText = textStep3;
      } else if (effectiveItemCount === 2) {
        progressText = textStep2.replace('[X]', remainingCount);
      } else if (effectiveItemCount === 1) {
        progressText = textStep1.replace('[X]', remainingCount);
      } else {
        progressText = textStep0.replace('[X]', remainingCount);
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
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        button.classList.add('loading');

        const card = button.closest('.bundle-product__card');
        const variantId = button.getAttribute('data-variant-id') || null;
        const sellingPlanID = getSellingPlanIdFromRitual(card) || button.getAttribute('data-selling-plan') || null;

        // Debug: log what we're sending (remove in production if desired)
        console.log('[Bundle ATC] variantId:', variantId, 'sellingPlanID:', sellingPlanID, 'card:', !!card);

        // Get product data from the card for optimistic update (including collection and trio-bundle)
        const productData = card ? {
          title: card.querySelector('.bundle-product__title')?.textContent?.trim() || '',
          image: card.querySelector('.bundle-product__image')?.src || '',
          price: card.querySelector('.bundle-product__price--sale, .bundle-product__price--regular')?.textContent || '0',
          collection: (card.dataset.collection || '').trim(),
          trioBundle: card.dataset.trioBundle === 'true'
        } : null;

        // Add visual feedback class to product card and show quantity selector
        if (card) {
          card.classList.add('added', 'is-added-to-box');
          
          // Show quantity selector and hide button
          const quantityWrapper = card.querySelector('.bundle-product__quantity-wrapper');
          const atcButton = card.querySelector('.bundle-product__atc');
          
          
          
          // Remove the temporary is-added-to-box class after 2 seconds (keep 'added' class)
          setTimeout(() => {
            if (quantityWrapper && atcButton) {
            atcButton.style.display = 'none';
            quantityWrapper.style.display = 'flex';
            
            // Set initial quantity to 1
            const quantityInput = quantityWrapper.querySelector('.bundle-product__quantity-input');
            if (quantityInput) {
              quantityInput.value = '1';
            }
          }
            card.classList.remove('is-added-to-box');
          }, 2000);
        }

        // Don't await - let it run in background after optimistic update
        addToCart(variantId, sellingPlanID, 1, productData).then(() => {
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

    // Quantity wrapper: plus = add to cart (same as product card); minus = remove one from cart; input = display-only (synced by refreshCart)
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
        
        const sellingPlanID = getSellingPlanIdFromRitual(card) || card.querySelector('[data-selling-plan]')?.getAttribute('data-selling-plan') || null;
        
        let currentQuantity = parseInt(quantityInput.value) || 1;
        
        if (decreaseBtn) {
          if (currentQuantity > 1) {
            currentQuantity--;
            // Update cart; input value is synced from cart by refreshCart
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
          // Plus = same as add-to-cart on the product card; use ritual dropdown for selling plan
          const sellingPlanId = getSellingPlanIdFromRitual(card) || card.querySelector('[data-add-to-cart]')?.getAttribute('data-selling-plan') || null;
          const productData = {
            title: card.querySelector('.bundle-product__title')?.textContent?.trim() || '',
            image: card.querySelector('.bundle-product__image')?.src || '',
            price: card.querySelector('.bundle-product__price--sale, .bundle-product__price--regular')?.textContent || '0',
            collection: (card.dataset.collection || '').trim(),
            trioBundle: card.dataset.trioBundle === 'true'
          };
          addToCart(variantId, sellingPlanId, 1, productData);
          debouncedRefreshCart();
        }
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

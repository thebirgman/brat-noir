(function () {
  // Store box items in memory (not in cart)
  let boxItems = [];
  const MAX_ITEMS = 5;

  function updateProgress() {
    const count = boxItems.length;
    const progress = (count / MAX_ITEMS) * 100;
    const remaining = MAX_ITEMS - count;
    
    // Update progress bar
    const progressFill = document.querySelector('.build-gift-box__progress-fill');
    if (progressFill) {
      progressFill.style.setProperty('--progress', `${progress}%`);
    }
    
    // Update progress text
    const progressText = document.querySelector('.build-gift-box__progress-count');
    if (progressText) {
      progressText.textContent = count;
    }
    
    // Update sticky footer progress count
    const stickyFooterCount = document.querySelector('.sticky-footer__progress-count');
    if (stickyFooterCount) {
      stickyFooterCount.textContent = remaining;
    }
    
    // Update sticky footer text
    const stickyFooterText = document.querySelector('.sticky-footer__progress-text');
    if (stickyFooterText && remaining > 0) {
      stickyFooterText.innerHTML = `Add <span class="sticky-footer__progress-count">${remaining}</span> sets to complete your gift box.`;
    } else if (stickyFooterText && remaining === 0) {
      stickyFooterText.innerHTML = `Your gift box is complete!`;
    }
    
    // Enable/disable write note button
    const writeNoteBtn = document.querySelector('.build-gift-box__write-note');
    if (writeNoteBtn) {
      if (count === MAX_ITEMS) {
        writeNoteBtn.disabled = false;
      } else {
        writeNoteBtn.disabled = true;
      }
    }
  }

  function addToBox(productData) {
    if (boxItems.length >= MAX_ITEMS) {
      alert(`You can only add ${MAX_ITEMS} items to your gift box.`);
      return false;
    }

    // Find first empty slot
    const slots = document.querySelectorAll('.build-gift-box__cart-item');
    let emptySlot = null;
    let slotNumber = null;
    
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const slotNum = parseInt(slot.dataset.slot);
      const isFilled = boxItems.some(item => item.slot === slotNum);
      
      if (!isFilled) {
        emptySlot = slot;
        slotNumber = slotNum;
        break;
      }
    }

    if (!emptySlot) {
      return false;
    }

    // Add to box items array
    const boxItem = {
      slot: slotNumber,
      variantId: productData.variantId,
      productId: productData.productId,
      productHandle: productData.productHandle,
      title: productData.title,
      image: productData.image,
      collection: productData.collection
    };
    
    boxItems.push(boxItem);

    // Update UI
    if (emptySlot) {
      // Hide placeholder
      const placeholder = emptySlot.querySelector('.build-gift-box__cart-item-placeholder');
      if (placeholder) {
        placeholder.classList.add('hidden');
      }
      
      // Create and show image
      let image = emptySlot.querySelector('.build-gift-box__cart-item-image');
      if (!image) {
        image = document.createElement('img');
        image.className = 'build-gift-box__cart-item-image';
        const placeholder = emptySlot.querySelector('.build-gift-box__cart-item-placeholder');
        if (placeholder && placeholder.parentNode) {
          placeholder.parentNode.insertBefore(image, placeholder);
        }
      }
      image.src = productData.image;
      image.alt = productData.title;
      image.classList.add('show');

      // Update content
      const content = emptySlot.querySelector('.build-gift-box__cart-item-content');
      if (content) {
        let collectionEl = content.querySelector('.build-gift-box__cart-item-collection');
        const labelEl = content.querySelector('.build-gift-box__cart-item-label');
        const hintEl = content.querySelector('.build-gift-box__cart-item-hint');
        
        // Create or update collection element
        if (!collectionEl) {
          collectionEl = document.createElement('p');
          collectionEl.className = 'build-gift-box__cart-item-collection';
          if (labelEl && labelEl.parentNode) {
            labelEl.parentNode.insertBefore(collectionEl, labelEl);
          } else {
            content.insertBefore(collectionEl, content.firstChild);
          }
        }
        collectionEl.textContent = productData.collection || '';
        collectionEl.style.display = productData.collection ? 'block' : 'none';
        
        // Update label
        if (labelEl) {
          labelEl.textContent = productData.title;
        }
        
        // Hide hint
        if (hintEl) {
          hintEl.style.display = 'none';
        }
      }

      // Show remove button
      const removeBtn = emptySlot.querySelector('.build-gift-box__cart-item-remove');
      if (removeBtn) {
        removeBtn.style.display = 'block';
      }

      // Update remaining count for other slots
      updateRemainingCounts();
    }

    updateProgress();
    return true;
  }

  function removeFromBox(slotNumber) {
    boxItems = boxItems.filter(item => item.slot !== slotNumber);
    
    const slot = document.querySelector(`.build-gift-box__cart-item[data-slot="${slotNumber}"]`);
    if (slot) {
      // Show placeholder
      const placeholder = slot.querySelector('.build-gift-box__cart-item-placeholder');
      if (placeholder) {
        placeholder.classList.remove('hidden');
      }

      // Hide image
      const image = slot.querySelector('.build-gift-box__cart-item-image');
      if (image) {
        image.classList.remove('show');
        image.src = '';
        image.alt = '';
      }

      // Reset content
      const content = slot.querySelector('.build-gift-box__cart-item-content');
      if (content) {
        const remaining = MAX_ITEMS - boxItems.length;
        const labelEl = content.querySelector('.build-gift-box__cart-item-label');
        const hintEl = content.querySelector('.build-gift-box__cart-item-hint');
        const collectionEl = content.querySelector('.build-gift-box__cart-item-collection');
        
        if (labelEl) {
          labelEl.textContent = 'Select a Product';
        }
        
        if (hintEl) {
          const remainingSpan = hintEl.querySelector('.build-gift-box__cart-item-remaining');
          if (remainingSpan) {
            remainingSpan.textContent = remaining;
          }
          hintEl.style.display = 'block';
        }
        
        if (collectionEl) {
          collectionEl.style.display = 'none';
        }
      }

      // Hide remove button
      const removeBtn = slot.querySelector('.build-gift-box__cart-item-remove');
      if (removeBtn) {
        removeBtn.style.display = 'none';
      }
    }

    updateRemainingCounts();
    updateProgress();
  }

  function updateRemainingCounts() {
    const remaining = MAX_ITEMS - boxItems.length;
    const hintElements = document.querySelectorAll('.build-gift-box__cart-item-hint .build-gift-box__cart-item-remaining');
    hintElements.forEach(el => {
      const slot = el.closest('.build-gift-box__cart-item');
      if (slot) {
        const slotNum = parseInt(slot.dataset.slot);
        const isFilled = boxItems.some(item => item.slot === slotNum);
        if (!isFilled) {
          //el.textContent = remaining;
        }
      }
    });
  }

  function showNoteSection() {
    const noteSection = document.querySelector('.build-gift-box__note-section');
    const writeNoteBtn = document.querySelector('.build-gift-box__write-note');
    const checkoutBtn = document.querySelector('.build-gift-box__note-checkout');
    if (noteSection) {
      noteSection.style.display = 'block';
    }
    if (writeNoteBtn) {
      writeNoteBtn.style.display = 'none';
    }
    if (checkoutBtn) {
      checkoutBtn.style.display = 'block';
    }
  }

  async function handleCheckout(note) {
    // Get the gift box product from section settings
    const section = document.querySelector('.build-gift-box');
    if (!section) return;

    // Get the gift box product handle from section data attribute
    const giftBoxProductHandle = section.dataset.giftBoxProductHandle;
    if (!giftBoxProductHandle) {
      alert('Gift box product not configured. Please contact support.');
      return;
    }

    // Get the first variant of the gift box product
    try {
      const productResponse = await fetch(`/products/${giftBoxProductHandle}.js`);
      if (!productResponse.ok) {
        throw new Error('Failed to fetch product');
      }
      
      const productData = await productResponse.json();
      const variantId = productData.variants[0]?.id;
      
      if (!variantId) {
        throw new Error('No variant found');
      }

      // Build line item properties
      const properties = {};
      
      // Add box items as properties
      boxItems.forEach((item, index) => {
        properties[`Gift Item ${index + 1}`] = item.title;
      });
      
      // Add note as property
      if (note && note.trim()) {
        properties['Gift Note'] = note.trim();
      }

      // Add to cart
      const item = {
        id: variantId,
        quantity: 1,
        properties: properties
      };

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
        throw new Error('Failed to add to cart');
      }

      // Redirect to cart or checkout
      window.location.href = '/cart';
      
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to add gift box to cart. Please try again.');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Handle "Add to Box" buttons
    const addToBoxButtons = document.querySelectorAll('[data-add-to-box]');
    addToBoxButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        button.classList.add('loading');

        const productData = {
          variantId: button.getAttribute('data-variant-id'),
          productId: button.getAttribute('data-product-id'),
          productHandle: button.getAttribute('data-product-handle'),
          title: button.getAttribute('data-product-title'),
          image: button.getAttribute('data-product-image'),
          collection: button.getAttribute('data-product-collection')
        };

        // Get the product card and add selected class
        const productCard = button.closest('.bundle-product__card');
        if (productCard) {
          productCard.classList.add('is-added-to-box');
          
          // Remove the class after 2 seconds
          setTimeout(() => {
            productCard.classList.remove('is-added-to-box');
          }, 2000);
        }

        const success = addToBox(productData);
        
        button.classList.remove('loading');
        
        if (!success) {
          alert('Unable to add product to box. The box may be full.');
        }
      });
    });

    // Handle remove from box buttons
    document.addEventListener('click', (event) => {
      const removeBtn = event.target.closest('[data-remove-slot]');
      if (removeBtn) {
        event.preventDefault();
        event.stopPropagation();
        
        const slotNumber = parseInt(removeBtn.getAttribute('data-remove-slot'));
        removeFromBox(slotNumber);
      }
    });

    // Handle "Write Your Note" button
    const writeNoteBtn = document.querySelector('.build-gift-box__write-note');
    if (writeNoteBtn) {
      writeNoteBtn.addEventListener('click', () => {
        if (!writeNoteBtn.disabled) {
          showNoteSection();
        }
      });
    }

    // Handle checkout button in note section
    const checkoutBtn = document.querySelector('.build-gift-box__note-checkout');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', async () => {
        const textarea = document.querySelector('.build-gift-box__note-textarea');
        const note = textarea ? textarea.value : '';
        
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Wrapping...';
        
        try {
          await handleCheckout(note);
        } catch (error) {
          console.error('Checkout error:', error);
          checkoutBtn.disabled = false;
          checkoutBtn.textContent = 'SECURE CHECKOUT';
        }
      });
    }

    // Handle cart drawer toggle
    const cartToggleButtons = document.querySelectorAll('#a-open-cart-main-button');
    cartToggleButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const cart = document.querySelector('.build-gift-box__cart');
        if (cart) {
            console.log('showing')
          cart.classList.remove('show');
        }
      });
    });

    // Initialize progress
    updateProgress();
  });
})();

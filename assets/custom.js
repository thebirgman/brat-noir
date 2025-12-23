/*
* Pipeline Theme
*
* Use this file to add custom Javascript to Pipeline.  Keeping your custom
* Javascript in this fill will make it easier to update Pipeline. In order
* to use this file you will need to open layout/theme.liquid and uncomment
* the custom.js script import line near the bottom of the file.
*
*/


(function() {

  
  function updateCustomCartSubtotal() {
    fetch('/cart.js')
      .then(res => res.json())
      .then(cart => {
        const subtotalEl = document.querySelector('.cart__footer__itemtotal .cart__footer__value');
        if (subtotalEl && typeof Shopify !== 'undefined' && Shopify.formatMoney) {
          subtotalEl.textContent = Shopify.formatMoney(cart.total_price, Shopify.money_format);
        }
      });
  }

  // Function to add subscription info icon
  function addSubscriptionInfoIcon() {
    const radioLabel = document.querySelector('.appstle_include_dropdown .appstle_radio_label');
    
    if (radioLabel && !radioLabel.querySelector('.subscription-info-icon')) {
      // Create info icon
      const infoIcon = document.createElement('span');
      infoIcon.className = 'subscription-info-icon';
      infoIcon.setAttribute('role', 'button');
      infoIcon.setAttribute('tabindex', '0');
      infoIcon.setAttribute('aria-label', 'Learn more about subscription benefits');
      infoIcon.innerHTML = '<span class="subscription-info-icon__circle">i</span>';
      
      // Add click handler
      infoIcon.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openSubscriptionPopup();
      });
      
      // Add keyboard support
      infoIcon.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          openSubscriptionPopup();
        }
      });
      
      // Append after the label
      radioLabel.appendChild(infoIcon);
    }
  }

  // Function to open subscription popup
  function openSubscriptionPopup() {
    const popup = document.getElementById('subscription-info-popup');
    if (popup) {
      // Check if MicroModal is available
      if (typeof MicroModal !== 'undefined') {
        MicroModal.show('subscription-info-popup', {
          onShow: function(modal) {
            document.body.style.overflow = 'hidden';
          },
          onClose: function(modal) {
            document.body.style.overflow = '';
          }
        });
      } else {
        // Fallback: manually show the modal
        popup.setAttribute('aria-hidden', 'false');
        popup.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      }
    }
  }

  // Wait for Appstle subscription widget to load
  function waitForAppstleWidget() {
    const maxAttempts = 50;
    let attempts = 0;
    
    const checkInterval = setInterval(function() {
      attempts++;
      const radioLabel = document.querySelector('.appstle_include_dropdown .appstle_radio_label');
      
      if (radioLabel) {
        clearInterval(checkInterval);
        addSubscriptionInfoIcon();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.warn('Appstle subscription widget not found after maximum attempts');
      }
    }, 200);
  }

  document.addEventListener('DOMContentLoaded', function () {
    updateCustomCartSubtotal();
    waitForAppstleWidget();
  });

  // Also check after page fully loads (in case Appstle loads dynamically)
  window.addEventListener('load', function() {
    setTimeout(waitForAppstleWidget, 500);
  });

  


  // Below are example event listeners.  They listen for theme events that Pipeline
  // fires in order to make it easier for you to add customizations.

  // Keep your scripts inside this IIFE function call to avoid leaking your
  // variables into the global scope.

  
  document.addEventListener('theme:variant:change', function(event) {
    // You might use something like this to write a pre-order feature or a
    // custom swatch feature.
    var variant = event.detail.variant;
    var container = event.target;
    if (variant) {
      console.log('Container ———————— ↓');
      console.log(container);
      console.log('Variant —————————— ↓');
      console.log(variant);
      // ... update some element on the page
    }
  });

  document.addEventListener('theme:cart:change', function(event) {
    var cart = event.detail.cart;
    if (cart) {
      console.log('Cart ———————————— ↓');
      console.log(cart);
      updateCustomCartSubtotal();
      // ... update an app or a custom shipping caluclator
    }
  });
  // Fired when page loads to update header values
  document.addEventListener('theme:cart:init', (e) => {
    console.log('theme:cart:init');
    console.log(e);
  });

  // Debounced scroll listeners.  Up and down only fire on direction changes
  // These events are useful for creating sticky elements and popups.
  document.addEventListener('theme:scroll', e => { console.log(e); });
  document.addEventListener('theme:scroll:up', e => { console.log(e); });
  document.addEventListener('theme:scroll:down', e => { console.log(e); });

  // Debounced resize listener to bundle changes that trigger document reflow
  document.addEventListener('theme:resize', e => { console.log(e); });

  // Locks and unlocks page scroll for modals and drawers
  // These are commented out because firing them will lock the page scroll
  // the lock event must set `detail` to the modal or drawer body so the 
  // scroll locking code knows what element should maintain scoll. 
  // document.dispatchEvent(new CustomEvent('theme:scroll:lock', {bubbles: true, detail: scrollableInnerElement}));
  // document.dispatchEvent(new CustomEvent('theme:scroll:unlock', {bubbles: true}));


  // ^^ Keep your scripts inside this IIFE function call to avoid leaking your
  // variables into the global scope.
})();




(function () {
  async function addToCart(variantId, sellingPlanId, quantity) {
    console.log('variantId:', variantId);
    console.log('sellingPlanId:', sellingPlanId);

    const item = {
      id: parseInt(variantId),
      quantity: quantity
    };

    if (sellingPlanId) {
      item.selling_plan = parseInt(sellingPlanId);
    }
    
    await fetch('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [item]
      })
    });

    // Update bundle cart UI and get cart data
    const cartData = await refreshCart();
    
    // Update theme's cart drawer
    if (cartData) {
      document.dispatchEvent(new CustomEvent('theme:cart:change', {
        detail: {
          cart: cartData
        },
        bubbles: true
      }));
    }
  }

  async function removeFromCart(variantId) {
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

    // Update bundle cart UI and get cart data
    const cartData = await refreshCart();
    
    // Update theme's cart drawer
    if (cartData) {
      document.dispatchEvent(new CustomEvent('theme:cart:change', {
        detail: {
          cart: cartData
        },
        bubbles: true
      }));
    }
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
    if (total) total.innerHTML = '$' + ((data.total_price || 0) / 100).toFixed(2);

    const progress = document.querySelector('.bundle-products__cart-progress-bar');
    if (progress) progress.style.setProperty('--progress', (data.item_count / 5) * 100 + '%');

    const remaining = document.querySelector('.bundle-products__cart-progress-text');
    if (remaining) {
      const itemCount = data.item_count;
      const remainingCount = 5 - itemCount;
      let progressText = '';
      
      // Get text templates from data attributes
      const textDefault = remaining.dataset.progressTextDefault || 'You are [X] sets away from 20% OFF';
      const textTwoMore = remaining.dataset.progressTextTwoMore || 'Just 2 more sets to unlock 20% OFF';
      const textOneMore = remaining.dataset.progressTextOneMore || 'Just 1 more set to unlock 20% OFF';
      const textComplete = remaining.dataset.progressTextComplete || 'We love to see it. 20% OFF applied.';
      
      // Apply conditional logic matching the Liquid template
      if (itemCount >= 5) {
        progressText = textComplete;
      } else if (itemCount === 4) {
        progressText = textOneMore;
      } else if (itemCount === 3) {
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

        await addToCart(variantId, 0, 1); // 🛠 missing await before

        button.classList.remove('loading');
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
        await removeFromCart(variantId);
        button.classList.remove('loading');
      }
    });

    refreshCart();
  });
})();

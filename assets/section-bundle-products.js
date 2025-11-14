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

    await refreshCart();
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

    await refreshCart();
  }

  async function refreshCart() {
    return fetch('/cart.js')
      .then(response => response.json())
      .then(data => {
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
          remaining.innerHTML = data.item_count < 5
            ? `You are ${5 - data.item_count} more products away from a bundle!`
            : 'Your bundle is complete!';
        }
      });
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

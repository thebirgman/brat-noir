(function () {
  'use strict';

  /**
   * Gift Steps Section JavaScript
   * Handles mobile slider functionality
   */

  function initGiftSteps() {
    const sections = document.querySelectorAll('.gift-steps');
    
    sections.forEach(section => {
      const sliderTrack = section.querySelector('.gift-steps__slider-track');
      const dots = section.querySelectorAll('.gift-steps__dot');
      
      if (!sliderTrack || dots.length === 0) return;
      
      // Dot click handlers
      dots.forEach((dot, index) => {
        dot.addEventListener('click', function(e) {
          e.preventDefault();
          scrollToSlide(sliderTrack, index);
          updateDots(section, index);
        });
      });
      
      // Scroll event handler with debounce
      let scrollTimeout;
      sliderTrack.addEventListener('scroll', function() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          updateDotsOnScroll(sliderTrack, section);
        }, 100);
      });
      
      // Touch swipe support
      let isScrolling = false;
      sliderTrack.addEventListener('touchstart', function() {
        isScrolling = true;
      });
      
      sliderTrack.addEventListener('touchend', function() {
        isScrolling = false;
        setTimeout(() => {
          updateDotsOnScroll(sliderTrack, section);
        }, 150);
      });
    });
  }

  /**
   * Scroll to specific slide
   */
  function scrollToSlide(sliderTrack, index) {
    const slides = sliderTrack.querySelectorAll('.gift-steps__slide');
    if (slides[index]) {
      slides[index].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }

  /**
   * Update dots based on current scroll position
   */
  function updateDotsOnScroll(sliderTrack, section) {
    const slides = sliderTrack.querySelectorAll('.gift-steps__slide');
    const scrollLeft = sliderTrack.scrollLeft;
    const slideWidth = slides[0] ? slides[0].offsetWidth : 0;
    
    if (slideWidth === 0) return;
    
    // Calculate which slide is most visible
    const currentIndex = Math.round(scrollLeft / slideWidth);
    updateDots(section, currentIndex);
  }

  /**
   * Update dot active state
   */
  function updateDots(section, activeIndex) {
    const dots = section.querySelectorAll('.gift-steps__dot');
    dots.forEach((dot, index) => {
      if (index === activeIndex) {
        dot.classList.add('is-active');
      } else {
        dot.classList.remove('is-active');
      }
    });
  }

  /**
   * Initialize on DOM ready
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGiftSteps);
  } else {
    initGiftSteps();
  }

  /**
   * Reinitialize on Shopify section events (for theme editor)
   */
  if (typeof Shopify !== 'undefined' && Shopify.designMode) {
    document.addEventListener('shopify:section:load', function(event) {
      const section = event.target.querySelector('.gift-steps');
      if (section) {
        initGiftSteps();
      }
    });
  }
})();


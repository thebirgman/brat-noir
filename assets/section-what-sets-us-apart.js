(function () {
  'use strict';

  /**
   * What Sets Us Apart Section JavaScript
   * Handles tab switching and mobile slider functionality
   */

  function initWhatSetsUsApart() {
    const sections = document.querySelectorAll('.what-sets-us-apart');
    
    sections.forEach(section => {
      const sectionId = section.dataset.sectionId;
      
      // Initialize tab functionality
      initTabs(section, sectionId);
      
      // Initialize mobile slider
      initMobileSlider(section, sectionId);
    });
  }

  /**
   * Initialize tab switching functionality
   */
  function initTabs(section, sectionId) {
    const labels = section.querySelectorAll('.what-sets-us-apart__label');
    const contents = section.querySelectorAll('.what-sets-us-apart__content');
    const mobileMainImages = section.querySelectorAll('.what-sets-us-apart__main-image-mobile');
    
    if (labels.length === 0 || contents.length === 0) return;

    labels.forEach(label => {
      label.addEventListener('click', function(e) {
        e.preventDefault();
        
        const tabId = this.dataset.tab;
        
        // Update labels
        labels.forEach(l => {
          l.classList.remove('is-active');
          l.setAttribute('aria-selected', 'false');
        });
        
        this.classList.add('is-active');
        this.setAttribute('aria-selected', 'true');
        
        // Update mobile main images
        mobileMainImages.forEach(img => {
          if (img.dataset.mainImageMobile === tabId) {
            img.classList.add('is-active');
          } else {
            img.classList.remove('is-active');
          }
        });
        
        // Update content panels
        contents.forEach(content => {
          if (content.dataset.content === tabId) {
            content.classList.add('is-active');
            content.removeAttribute('hidden');
            
            // Reset mobile slider position when tab changes
            const sliderTrack = content.querySelector('.what-sets-us-apart__slider-track');
            if (sliderTrack) {
              sliderTrack.scrollLeft = 0;
              updateDots(content, 0);
            }
          } else {
            content.classList.remove('is-active');
            content.setAttribute('hidden', '');
          }
        });
      });
      
      // Keyboard navigation
      label.addEventListener('keydown', function(e) {
        const currentIndex = Array.from(labels).indexOf(this);
        let nextIndex;
        
        switch(e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            nextIndex = currentIndex > 0 ? currentIndex - 1 : labels.length - 1;
            labels[nextIndex].click();
            labels[nextIndex].focus();
            break;
          case 'ArrowRight':
            e.preventDefault();
            nextIndex = currentIndex < labels.length - 1 ? currentIndex + 1 : 0;
            labels[nextIndex].click();
            labels[nextIndex].focus();
            break;
          case 'Home':
            e.preventDefault();
            labels[0].click();
            labels[0].focus();
            break;
          case 'End':
            e.preventDefault();
            labels[labels.length - 1].click();
            labels[labels.length - 1].focus();
            break;
        }
      });
    });
  }

  /**
   * Initialize mobile slider functionality
   */
  function initMobileSlider(section, sectionId) {
    const contents = section.querySelectorAll('.what-sets-us-apart__content');
    
    contents.forEach(content => {
      const sliderTrack = content.querySelector('.what-sets-us-apart__slider-track');
      const dots = content.querySelectorAll('.what-sets-us-apart__dot');
      
      if (!sliderTrack || dots.length === 0) return;
      
      // Dot click handlers
      dots.forEach((dot, index) => {
        dot.addEventListener('click', function(e) {
          e.preventDefault();
          scrollToSlide(sliderTrack, index);
          updateDots(content, index);
        });
      });
      
      // Scroll event handler with debounce
      let scrollTimeout;
      sliderTrack.addEventListener('scroll', function() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          updateDotsOnScroll(sliderTrack, content);
        }, 100);
      });
      
      // Touch swipe support (already handled by scroll-snap)
      // But we can add momentum scrolling detection
      let isScrolling = false;
      sliderTrack.addEventListener('touchstart', function() {
        isScrolling = true;
      });
      
      sliderTrack.addEventListener('touchend', function() {
        isScrolling = false;
        setTimeout(() => {
          updateDotsOnScroll(sliderTrack, content);
        }, 150);
      });
    });
  }

  /**
   * Scroll to specific slide
   */
  function scrollToSlide(sliderTrack, index) {
    const slides = sliderTrack.querySelectorAll('.what-sets-us-apart__slide');
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
  function updateDotsOnScroll(sliderTrack, content) {
    const slides = sliderTrack.querySelectorAll('.what-sets-us-apart__slide');
    const scrollLeft = sliderTrack.scrollLeft;
    const slideWidth = slides[0] ? slides[0].offsetWidth : 0;
    
    if (slideWidth === 0) return;
    
    // Calculate which slide is most visible
    const currentIndex = Math.round(scrollLeft / slideWidth);
    updateDots(content, currentIndex);
  }

  /**
   * Update dot active state
   */
  function updateDots(content, activeIndex) {
    const dots = content.querySelectorAll('.what-sets-us-apart__dot');
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
    document.addEventListener('DOMContentLoaded', initWhatSetsUsApart);
  } else {
    initWhatSetsUsApart();
  }

  /**
   * Reinitialize on Shopify section events (for theme editor)
   */
  if (typeof Shopify !== 'undefined' && Shopify.designMode) {
    document.addEventListener('shopify:section:load', function(event) {
      const section = event.target.querySelector('.what-sets-us-apart');
      if (section) {
        const sectionId = section.dataset.sectionId;
        initTabs(section, sectionId);
        initMobileSlider(section, sectionId);
      }
    });
  }
})();

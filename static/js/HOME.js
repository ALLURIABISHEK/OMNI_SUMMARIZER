window.addEventListener("scroll", function() {
    let videoSection = document.getElementById("video-section");
    let scrollValue = window.scrollY;
    videoSection.style.transform = `translateY(-${scrollValue}px)`;
});



document.addEventListener("scroll", function() {
    const section = document.querySelector(".summarizer-section");
    const rect = section.getBoundingClientRect();
    
    if (rect.top < window.innerHeight * 0.8) {
        section.classList.add("reveal");
    }
});



//scroll animation

document.addEventListener("DOMContentLoaded", function () {
    const sr = ScrollReveal({
        distance: "80px",
        duration: 2000,
        delay: 400,
        reset: true, // Ensure it runs again when scrolling
    });

    // Reveal the text from right to left
    sr.reveal(".summarizer-text", { origin: "left", delay: 150 });

    // Reveal the container from left to right
    sr.reveal(".summarizer-container", { origin: "left", delay: 300 });

    // Reveal the horizontal neon line from right to left
    sr.reveal(".neon-line", { origin: "right", delay: 500 });

    // Reveal the vertical neon line from right to left
    sr.reveal(".neon-vertical-line", { origin: "right", delay: 600 });

    // Reveal the second horizontal neon line from left to right
    sr.reveal(".neon-lines", { origin: "right", delay: 500 });




    sr.reveal(".tagline-left", { origin: "left", delay: 400, duration: 1200 }); 
    sr.reveal(".tagline-right", { origin: "right", delay: 500, duration: 1200 });
     sr.reveal(".logo", { origin: "top", delay: 600, duration: 1200 }); 
     sr.reveal(".explore-btn", { origin: "bottom", delay: 700, duration: 1200 , reset:true});


     sr.reveal(".feature-box1", { origin: "left", delay: 400, duration: 1200 }); 
     sr.reveal(".feature-box2", { origin: "left", delay: 400, duration: 1200 }); 

     sr.reveal(".feature-box3", { origin: "right", delay: 500, duration: 1200 });
     sr.reveal(".feature-box4", { origin: "right", delay: 500, duration: 1200 });
    
     sr.reveal(".splits", { origin: "top", delay: 600, duration: 1200 }); 

     sr.reveal(".whatis", { origin: "top", delay: 600, duration: 1200 }); 

});



// Load animation for the left container
var leftAnimation = lottie.loadAnimation({
    container: document.getElementById('lottie-containere'),  // The container for the left side
    path: 'Animation - 1739702391967.json',  // Path to your JSON animation file
    renderer: 'svg',  // Rendering method
    autoplay: true  // Start the animation automatically
});

// Load animation for the right container
var rightAnimation = lottie.loadAnimation({
    container: document.getElementById('lottie-container-right'),  // The container for the right side
    path: 'Animation - 1739703193972.json',  // Path to your JSON animation file
    renderer: 'svg',  // Rendering method
    autoplay: true  // Start the animation automatically
});




//////////////////////////////////
 // Wait for page to fully load

  window.addEventListener('load', function () {
    const lottieContainer = document.getElementById('lottie-container');
    const blurOverlay = document.getElementById('blur-overlay');

    // Show animation and blur
    lottieContainer.style.display = 'block';
    blurOverlay.style.display = 'block';

    const animation = lottie.loadAnimation({
      container: lottieContainer,
      renderer: 'svg',
      loop: false,
      autoplay: true,
      path: 'static/your-animation.json' // Update this path
    });

    animation.addEventListener('complete', () => {
      // Hide animation and blur after it completes
      lottieContainer.style.display = 'none';
      blurOverlay.style.display = 'none';
    });
  });

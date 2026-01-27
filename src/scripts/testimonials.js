function initTestimonials() {
  console.log("Iniciando carrusel de testimonios...");
  const track = document.querySelector(".testimonials-grid");

  if (track) {
    // Duplicar elementos
    const items = Array.from(track.children);
    items.forEach((item) => {
      const clone = item.cloneNode(true);
      track.appendChild(clone);
    });

    let scrollSpeed = 0.3; // Ahora sí funcionará suave
    let isPaused = false;
    let currentScroll = track.scrollLeft; // Acumulador de precisión

    const scroll = () => {
      if (!isPaused && track) {
        currentScroll += scrollSpeed;
        track.scrollLeft = currentScroll;

        // Reset infinito
        if (currentScroll >= track.scrollWidth / 2) {
          currentScroll = 0;
          track.scrollLeft = 0;
        }
      }
      requestAnimationFrame(scroll);
    };

    requestAnimationFrame(scroll);

    // Event listeners
    track.addEventListener("mouseenter", () => (isPaused = true));
    track.addEventListener("mouseleave", () => (isPaused = false));
    track.addEventListener("touchstart", () => (isPaused = true));
    track.addEventListener("touchend", () => (isPaused = false));
  } else {
    console.error("No se encontró .testimonials-grid");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTestimonials);
} else {
  initTestimonials();
}

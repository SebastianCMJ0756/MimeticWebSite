/**
 * Configuración y lógica del formulario de suscripción (Newsletter) - MIMETIC
 */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('newsletter-form');
  const mensajeRespuesta = document.getElementById('mensaje-respuesta');
  const btnSubmit = document.getElementById('btn-submit');
  const inputFullname = document.getElementById('lead-fullname');
  const inputEmail = document.getElementById('lead-email');

  // Reemplaza esta URL con la de tu despliegue actual de Google Apps Script
  const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxxuVLLtLNZ3l0LYxZuhAtL8SreK5MEKjTJ_ja9qLG1-jF7dWjyYxxcqUR0L2uBpaF95w/exec";

  // Validación visual en tiempo real para habilitar/deshabilitar el botón
  const validarCampos = () => {
    if (inputFullname && inputEmail && btnSubmit) {
      if (inputFullname.value.trim() !== '' && inputEmail.value.trim() !== '') {
        btnSubmit.classList.remove('opacity-50', 'cursor-not-allowed');
        btnSubmit.classList.add('hover:bg-cyan-600', 'cursor-pointer');
        btnSubmit.removeAttribute('disabled');
      } else {
        btnSubmit.classList.add('opacity-50', 'cursor-not-allowed');
        btnSubmit.classList.remove('hover:bg-cyan-600', 'cursor-pointer');
        btnSubmit.setAttribute('disabled', 'true');
      }
    }
  };

  inputFullname?.addEventListener('input', validarCampos);
  inputEmail?.addEventListener('input', validarCampos);

  // Manejo del evento Submit del formulario
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullname = inputFullname.value.trim();
    const email = inputEmail.value.trim();

    if (!fullname || !email) {
      mostrarMensaje("Por favor completa todos los campos obligatorios.", "text-red-400");
      return;
    }

    // Deshabilitar botón temporalmente durante el envío
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Suscribiendo...";

    try {
      // Usamos text/plain para evitar que el navegador bloquee la petición por políticas CORS
      await fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          nombre_completo: fullname,
          correo: email
        })
      });

      // Mensaje de éxito al usuario
      mostrarMensaje("¡Te has suscrito con éxito a las actualizaciones de Mimetic!", "text-cyan-400");
      form.reset();
      validarCampos();
    } catch (error) {
      console.error("Error en la suscripción:", error);
      mostrarMensaje("Hubo un error al procesar tu suscripción. Inténtalo de nuevo.", "text-red-400");
    } finally {
      btnSubmit.textContent = "Suscribirme";
      btnSubmit.disabled = false;
    }
  });

  function mostrarMensaje(texto, clasesColor) {
    if (!mensajeRespuesta) return;
    mensajeRespuesta.textContent = texto;
    mensajeRespuesta.className = `mt-4 text-sm font-mono ${clasesColor}`;
    mensajeRespuesta.classList.remove('hidden');
  }
});
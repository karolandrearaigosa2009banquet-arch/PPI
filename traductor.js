/* traductor.js
 * Muestra al abrir la página un aviso parecido al de Chrome/Edge (inglés -> español):
 * "¿Traducir página de inglés?" y traduce con Google Translate.
 * Uso: agrega esta línea antes de </body> en cada página (iniciosesion.html, menu.html, ...):
 *   <script src="traductor.js"></script>
 */
(function () {
  var IDIOMA_ORIGEN = 'en';
  var IDIOMA_DESTINO = 'es';
  var CLAVE = 'ppi_aviso_traduccion_cerrado';

  // 1) Estilos del aviso
  var css = document.createElement('style');
  css.textContent =
    '#aviso-traduccion{position:fixed;top:16px;right:16px;z-index:99999;width:340px;max-width:calc(100vw - 32px);' +
    'background:#fff;color:#202124;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.28);padding:16px;' +
    'font-family:system-ui,Arial,sans-serif;font-size:14px}' +
    '#aviso-traduccion h4{margin:0 0 12px;font-size:15px;font-weight:600}' +
    '#aviso-traduccion .acciones{display:flex;gap:8px;justify-content:flex-end}' +
    '#aviso-traduccion button{border:0;border-radius:18px;padding:8px 16px;cursor:pointer;font-size:14px}' +
    '#aviso-traduccion .si{background:#1a73e8;color:#fff}' +
    '#aviso-traduccion .no{background:transparent;color:#1a73e8}' +
    '.goog-te-banner-frame,.skiptranslate iframe{display:none!important}body{top:0!important}';
  document.head.appendChild(css);

  // 2) Contenedor oculto del widget de Google Translate
  var cont = document.createElement('div');
  cont.id = 'google_translate_element';
  cont.style.display = 'none';
  document.body.appendChild(cont);

  window.googleTranslateElementInit = function () {
    new google.translate.TranslateElement(
      { pageLanguage: IDIOMA_ORIGEN, includedLanguages: IDIOMA_DESTINO + ',' + IDIOMA_ORIGEN, autoDisplay: false },
      'google_translate_element'
    );
  };

  var s = document.createElement('script');
  s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  document.body.appendChild(s);

  function traducir(idioma) {
    var intentos = 0;
    var t = setInterval(function () {
      var combo = document.querySelector('.goog-te-combo');
      if (combo) {
        combo.value = idioma;
        combo.dispatchEvent(new Event('change'));
        clearInterval(t);
      } else if (++intentos > 40) {
        clearInterval(t);
      }
    }, 250);
  }

  // 3) Aviso visible al abrir la página
  function mostrarAviso() {
    try { if (sessionStorage.getItem(CLAVE)) return; } catch (e) {}
    var box = document.createElement('div');
    box.id = 'aviso-traduccion';
    box.innerHTML =
      '<h4>¿Traducir esta página de inglés a español?</h4>' +
      '<div class="acciones">' +
      '<button class="no" type="button">Ahora no</button>' +
      '<button class="si" type="button">Traducir</button></div>';
    document.body.appendChild(box);

    function cerrar() {
      try { sessionStorage.setItem(CLAVE, '1'); } catch (e) {}
      box.remove();
    }
    box.querySelector('.si').onclick = function () { traducir(IDIOMA_DESTINO); cerrar(); };
    box.querySelector('.no').onclick = cerrar;
  }

  mostrarAviso();
})();

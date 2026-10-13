/* traductor.js — traductor multiidioma para la app PQR (Google Translate).
 * - Al abrir la página (si aún no elegiste idioma) muestra un aviso para traducir.
 * - Un botón flotante "Idioma" permite cambiar de idioma o volver a Español.
 * - Google solo se carga si la persona elige traducir (no antes).
 */
(function () {
  var ORIGEN = 'es';
  var IDIOMAS = [
    ['en', 'English'], ['pt', 'Português'], ['fr', 'Français'], ['de', 'Deutsch'],
    ['it', 'Italiano'], ['zh-CN', '中文'], ['ja', '日本語'], ['ko', '한국어'],
    ['ru', 'Русский'], ['ar', 'العربية'], ['hi', 'हिन्दी']
  ];
  var LLAVE = 'ppi_idioma';
  var CERRADO = 'ppi_aviso_traduccion_cerrado';

  // Google Translate envuelve el texto en <font>; este parche evita que React falle al re-renderizar.
  if (typeof Node === 'function' && Node.prototype) {
    var quitar = Node.prototype.removeChild;
    Node.prototype.removeChild = function (hijo) {
      if (hijo.parentNode !== this) { return hijo; }
      return quitar.apply(this, arguments);
    };
    var insertar = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function (nuevo, referencia) {
      if (referencia && referencia.parentNode !== this) { return nuevo; }
      return insertar.apply(this, arguments);
    };
  }

  function leer(k, almacen) { try { return (almacen || localStorage).getItem(k); } catch (e) { return null; } }
  function escribir(k, v, almacen) { try { (almacen || localStorage).setItem(k, v); } catch (e) {} }
  function borrar(k, almacen) { try { (almacen || localStorage).removeItem(k); } catch (e) {} }

  function nombreDe(codigo) {
    if (codigo === ORIGEN) { return 'Español'; }
    for (var i = 0; i < IDIOMAS.length; i++) { if (IDIOMAS[i][0] === codigo) { return IDIOMAS[i][1]; } }
    return 'Español';
  }

  function ponerCookie(codigo) {
    document.cookie = 'googtrans=/' + ORIGEN + '/' + codigo + '; path=/';
  }
  function quitarCookie() {
    var vencida = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    document.cookie = vencida;
    document.cookie = vencida + '; domain=' + location.hostname;
    document.cookie = vencida + '; domain=.' + location.hostname;
  }
  function estaTraducida() {
    return /googtrans=/.test(document.cookie) || /translated/.test(document.documentElement.className);
  }

  var googleCargado = false;
  function cargarGoogle() {
    if (googleCargado) { return; }
    googleCargado = true;
    var cont = document.createElement('div');
    cont.id = 'google_translate_element';
    cont.style.display = 'none';
    document.body.appendChild(cont);
    window.googleTranslateElementInit = function () {
      new google.translate.TranslateElement({
        pageLanguage: ORIGEN,
        includedLanguages: IDIOMAS.map(function (i) { return i[0]; }).join(','),
        autoDisplay: false
      }, 'google_translate_element');
    };
    var s = document.createElement('script');
    s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    document.body.appendChild(s);
  }

  var etiqueta; // texto del botón flotante

  function aplicar(codigo) {
    if (codigo === ORIGEN) {
      var recargar = estaTraducida();
      quitarCookie();
      borrar(LLAVE);
      if (recargar) { location.reload(); return; }
      etiqueta.textContent = 'Idioma: Español';
      return;
    }
    escribir(LLAVE, codigo);
    ponerCookie(codigo);
    etiqueta.textContent = 'Idioma: ' + nombreDe(codigo);
    cargarGoogle();
    var intentos = 0;
    var t = setInterval(function () {
      var combo = document.querySelector('.goog-te-combo');
      if (combo) {
        combo.value = codigo;
        combo.dispatchEvent(new Event('change'));
        clearInterval(t);
      } else if (++intentos > 40) {
        clearInterval(t);
        location.reload(); // la cookie hace que Google traduzca al recargar
      }
    }, 250);
  }

  function iniciar() {
    var css = document.createElement('style');
    css.textContent =
      '.ppi-tr{font-family:system-ui,Arial,sans-serif;font-size:14px;color:#202124}' +
      '#aviso-traduccion{position:fixed;top:16px;right:16px;z-index:99999;width:360px;max-width:calc(100vw - 32px);background:#fff;border-radius:14px;box-shadow:0 6px 28px rgba(0,0,0,.28);padding:16px}' +
      '#aviso-traduccion h4{margin:0 0 12px;font-size:15px;font-weight:600}' +
      '#aviso-traduccion select{width:100%;padding:9px 10px;margin-bottom:12px;border:1px solid #c6d4e6;border-radius:10px;font:inherit;background:#fff}' +
      '#aviso-traduccion .acciones{display:flex;gap:8px;justify-content:flex-end}' +
      '.ppi-tr button{border:0;border-radius:18px;padding:8px 16px;cursor:pointer;font-size:14px;font-family:inherit}' +
      '.ppi-tr .si{background:#1a73e8;color:#fff}.ppi-tr .no{background:transparent;color:#1a73e8}' +
      '#idioma-flotante{position:fixed;right:16px;bottom:16px;z-index:99998}' +
      '#idioma-flotante .abrir{display:flex;align-items:center;gap:6px;padding:10px 16px;background:rgba(255,255,255,.88);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(20,102,195,.25);box-shadow:0 8px 24px rgba(10,58,130,.22);color:#0a3a82;font-weight:600}' +
      '#idioma-flotante .menu{position:absolute;right:0;bottom:52px;width:210px;max-height:60vh;overflow-y:auto;background:#fff;border-radius:14px;box-shadow:0 10px 32px rgba(0,0,0,.28);padding:6px;display:none}' +
      '#idioma-flotante .menu.abierto{display:block}' +
      '#idioma-flotante .menu button{display:block;width:100%;text-align:left;border-radius:10px;padding:9px 12px;background:transparent;color:#202124}' +
      '#idioma-flotante .menu button:hover{background:#eaf2fd}' +
      '#idioma-flotante .menu button.actual{background:#dbe9fb;color:#0a3a82;font-weight:700}' +
      '.goog-te-banner-frame,.skiptranslate iframe{display:none!important}body{top:0!important}';
    document.head.appendChild(css);

    var guardado = leer(LLAVE);
    if (guardado && guardado !== ORIGEN) { ponerCookie(guardado); cargarGoogle(); }

    // Botón flotante de idioma
    var caja = document.createElement('div');
    caja.id = 'idioma-flotante';
    caja.className = 'ppi-tr notranslate';
    caja.setAttribute('translate', 'no');
    var abrir = document.createElement('button');
    abrir.type = 'button';
    abrir.className = 'abrir';
    abrir.setAttribute('aria-haspopup', 'listbox');
    abrir.setAttribute('aria-expanded', 'false');
    abrir.innerHTML = '<span aria-hidden="true">🌐</span><span class="etq"></span>';
    etiqueta = abrir.querySelector('.etq');
    etiqueta.textContent = 'Idioma: ' + nombreDe(guardado || ORIGEN);
    var menu = document.createElement('div');
    menu.className = 'menu';
    menu.setAttribute('role', 'listbox');
    var opciones = [[ORIGEN, 'Español (original)']].concat(IDIOMAS);
    opciones.forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'option');
      b.setAttribute('data-idioma', o[0]);
      b.textContent = o[1];
      if ((guardado || ORIGEN) === o[0]) { b.className = 'actual'; }
      b.onclick = function () {
        menu.className = 'menu';
        abrir.setAttribute('aria-expanded', 'false');
        var todos = menu.querySelectorAll('button');
        for (var i = 0; i < todos.length; i++) { todos[i].className = (todos[i] === b) ? 'actual' : ''; }
        var aviso = document.getElementById('aviso-traduccion');
        if (aviso) { aviso.remove(); }
        aplicar(o[0]);
      };
      menu.appendChild(b);
    });
    abrir.onclick = function () {
      var abierto = menu.className.indexOf('abierto') === -1;
      menu.className = abierto ? 'menu abierto' : 'menu';
      abrir.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    };
    caja.appendChild(menu);
    caja.appendChild(abrir);
    document.body.appendChild(caja);

    // Aviso inicial (solo si no hay idioma elegido y no se cerró en esta sesión)
    if (guardado || leer(CERRADO, sessionStorage)) { return; }
    var box = document.createElement('div');
    box.id = 'aviso-traduccion';
    box.className = 'ppi-tr notranslate';
    box.setAttribute('translate', 'no');
    var opts = IDIOMAS.map(function (i) { return '<option value="' + i[0] + '">' + i[1] + '</option>'; }).join('');
    box.innerHTML =
      '<h4>¿Traducir esta página de español a otro idioma?</h4>' +
      '<select aria-label="Idioma de destino">' + opts + '</select>' +
      '<div class="acciones"><button class="no" type="button">Ahora no</button>' +
      '<button class="si" type="button">Traducir</button></div>';
    document.body.appendChild(box);
    box.querySelector('.no').onclick = function () { escribir(CERRADO, '1', sessionStorage); box.remove(); };
    box.querySelector('.si').onclick = function () {
      var codigo = box.querySelector('select').value;
      box.remove();
      var botones = menu.querySelectorAll('button');
      for (var i = 0; i < botones.length; i++) { botones[i].className = botones[i].getAttribute('data-idioma') === codigo ? 'actual' : ''; }
      aplicar(codigo);
    };
  }

  if (document.body) { iniciar(); } else { document.addEventListener('DOMContentLoaded', iniciar); }
})();

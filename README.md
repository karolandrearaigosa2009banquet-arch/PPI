# 🏥 Sistema de Gestión de PQR (Centros de Salud)

Bienvenido a la documentación técnica del **Sistema de Gestión de PQR**. Este proyecto permite a los usuarios registrar peticiones, quejas y reclamos dirigidos a centros de salud, y a los administradores/empleados gestionarlos y responderlos.

---

## 📚 Arquitectura y Navegación

Haz clic en los enlaces para acceder a los diagramas conceptuales interactivos:

* 🗺️ **[Mapa de Sitio (Sitemap)](./SITEMAP.md)**: Estructura jerárquica de navegación y módulos del sistema.
* 🧩 **[Mapa de Componentes](./COMPONENTS.md)**: Estructura de componentes Frontend y arquitectura de la interfaz.

---

## 📋 Entidades de Base de Datos Vinculadas
* **`CENTRO_SALUD`**: Institución médica asociada.
* **`USUARIO`**: Datos del cliente/paciente registrado.
* **`PQR`**: Registro del trámite (tipo, descripción, estado).
* **`GESTIONA`**: Asignación de la PQR a un empleado.
* **`RESPUESTA`**: Contestación final redactada por el administrador.
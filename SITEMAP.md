# 🗺️ Mapa Conceptual de Sitio (Sitemap)

```mermaid
graph TD
    Root["🌐 SISTEMA PQR"]
    
    %% Zona Pública
    Root --> Public["🔓 Acceso Público"]
    Public --> Home["🏠 Inicio / Landing"]
    Public --> Login["🔑 Login"]
    Public --> Register["📝 Registro de Usuario"]
    
    %% Portal Usuario
    Root --> PortalUser["👤 Portal Usuario (Cliente)"]
    PortalUser --> MisPQR["📁 Mis PQR"]
    MisPQR --> NuevaPQR["➕ Nueva PQR (Seleccionar Centro Salud)"]
    MisPQR --> DetallePQR["👁️ Ver Estado de PQR"]
    PortalUser --> MisRespuestas["📬 Mis Respuestas Recibidas"]
    PortalUser --> PerfilUser["⚙️ Perfil de Usuario"]
    
    %% Panel Admin
    Root --> PanelAdmin["🛡️ Panel Administrador / Empleado"]
    PanelAdmin --> Dashboard["📊 Dashboard & Métricas"]
    PanelAdmin --> GestionPQR["📋 Gestión de PQRs"]
    GestionPQR --> PQRPendientes["⏳ PQRs Pendientes"]
    GestionPQR --> PQRAsignadas["📌 PQRs Asignadas (GESTIONA)"]
    GestionPQR --> ResponderPQR["✍️ Responder PQR (RESPUESTA)"]
    PanelAdmin --> CentrosSalud["🏥 Gestión de Centros de Salud"]
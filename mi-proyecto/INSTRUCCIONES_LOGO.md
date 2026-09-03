# INSTRUCCIONES PARA AGREGAR EL LOGO

## Imagen del logo PQR

La imagen del logo con el símbolo de Salud y "REGISTRO DE PQR" debe copiarse a:

```
/workspaces/PPI/mi-proyecto/src/assets/logo.png
```

## Pasos:

1. **Guarda la imagen adjunta** como `logo.png` en tu computadora
2. **Cópiala a la carpeta assets:**
   - Abre el explorador de archivos
   - Navega a: `mi-proyecto/src/assets/`
   - Pega el archivo `logo.png` allí

## Dónde se usa:

- El logo actualmente se muestra en el header de la aplicación
- El SVG del caduceo (símbolo médico) está embebido en el código

## Si quieres usar la imagen en lugar del SVG:

Puedes importar la imagen en App.jsx y usarla así:

```jsx
import logoImg from './assets/logo.png'

// En el componente LogoApp:
<img src={logoImg} alt="Logo PQR" style={{ width: '100px', height: '100px' }} />
```

¡Todo el código ya está en español! 🎉

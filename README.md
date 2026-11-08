# `proyecto-inventario`

Un gestor de inventario creado con tauri (rust + react.js)

## Comandos útiles

Ejecutar los comandos de Tauri desde `src-tauri`:

```bash
cd ~/rustProject/proyecto-inventario/src-tauri
```

### Desarrollo

```bash
npm run tauri dev
```

Iniciar la aplicación de escritorio y el servidor de desarrollo de la interfaz.

### Compilar la aplicación

```bash
npm run tauri build
```

### Comprobar la interfaz

```bash
npm run lint --prefix ui
npm run build --prefix ui
```

### Instalar dependencias

Desde `src-tauri`, instalar las dependencias de Tauri y de la interfaz:

```bash
npm install
npm install --prefix ui
```

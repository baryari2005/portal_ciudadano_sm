# Google Maps Platform para direcciones

La aplicación funciona sin una cuenta de Google Cloud: el domicilio se escribe manualmente. Para activar sugerencias y validación se debe configurar Google Maps Platform.

1. Crear o seleccionar un proyecto en Google Cloud Console y habilitar facturación.
2. Habilitar **Maps JavaScript API** y **Places API (New)**.
3. Crear una API key con restricción de aplicación **Websites**.
4. Autorizar los orígenes utilizados, por ejemplo `http://localhost:3000/*` y `https://dominio.example/*`.
5. Restringir la key exclusivamente a **Maps JavaScript API** y **Places API (New)**.
6. Definir `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` en `.env` para desarrollo y en las variables del proveedor de despliegue para producción.
7. Reiniciar o volver a desplegar la aplicación.

Al elegir una sugerencia se guardan la dirección formateada, el Place ID, la latitud y la longitud. Si la variable no existe o Google no puede cargarse, el componente vuelve automáticamente al ingreso manual.

# Proveedores de mapas y direcciones

## OpenStreetMap (predeterminado)

La aplicación usa Leaflet, mapas de OpenStreetMap y geocodificación de Nominatim sin requerir una clave. La búsqueda se ejecuta únicamente al pulsar **Buscar**, pasa por `/api/geocoding`, conserva una caché temporal y limita las consultas externas.

Opcionalmente puede definirse un identificador de contacto para las solicitudes del servidor:

```env
NEXT_PUBLIC_MAP_PROVIDER=openstreetmap
NOMINATIM_USER_AGENT="massm-actividades/1.0 (contacto@dominio.gob.ar)"
```

El servicio público de Nominatim es adecuado para un volumen moderado. Si el tráfico crece, el adaptador debe apuntarse a una instancia propia o a un proveedor comercial compatible.

## Google Maps (alternativa futura)

La aplicación funciona sin una cuenta de Google Cloud: el domicilio se escribe manualmente. Para activar sugerencias y validación se debe configurar Google Maps Platform.

1. Crear o seleccionar un proyecto en Google Cloud Console y habilitar facturación.
2. Habilitar **Maps JavaScript API** y **Places API (New)**.
3. Crear una API key con restricción de aplicación **Websites**.
4. Autorizar los orígenes utilizados, por ejemplo `http://localhost:3000/*` y `https://dominio.example/*`.
5. Restringir la key exclusivamente a **Maps JavaScript API** y **Places API (New)**.
6. Definir `NEXT_PUBLIC_MAP_PROVIDER=google` y `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` en `.env` para desarrollo y en las variables del proveedor de despliegue para producción.
7. Reiniciar o volver a desplegar la aplicación.

Al elegir una sugerencia se guardan la dirección formateada, el Place ID, la latitud y la longitud. Si la variable no existe o Google no puede cargarse, el componente vuelve automáticamente al ingreso manual.

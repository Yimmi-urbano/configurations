# config-store

## Resumen del dashboard

`GET /api/dashboard/summary` recibe el dominio en el header `domain` y consulta las órdenes reales del negocio.

- Sin parámetros, resume el día actual en `America/Lima`.
- `?date=YYYY-MM-DD` consulta un solo día.
- `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` consulta un rango inclusivo.

La respuesta incluye ingresos confirmados, pedidos, variación contra el período anterior equivalente y los estados de pago. El tráfico usa Google Analytics Data API y cuenta `screenPageViews` para la ruta de inicio. Se puede cambiar con `?pagePath=/ruta`; por defecto usa `/` o `GOOGLE_ANALYTICS_HOME_PATH`.

## Mejores clientes

`GET /api/dashboard/top-customers` recibe el dominio en el header `domain` y consulta directamente la colección `orders` de la conexión principal a MongoDB. Agrupa únicamente órdenes con pago confirmado en el servidor, sin descargar la lista de pedidos al frontend.

- Por defecto usa los últimos 30 días.
- `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` define un rango inclusivo.
- `?limit=5` limita el resultado entre 1 y 50 clientes.
- `?sortBy=amount` ordena por monto comprado; `?sortBy=orders` por número de pedidos.

Cada cliente incluye `name`, `initials`, `amount`, `orders` y `detail` con sus productos más comprados. Para evitar duplicados, se agrupa por documento, correo, teléfono o nombre normalizado, en ese orden.

## Productos más vistos de la semana

`GET /api/dashboard/top-viewed-products` recibe el dominio en el header `domain` y usa Google Analytics para listar las rutas públicas `/product/:slug` con más vistas desde el lunes hasta hoy. Cada producto se compara con el mismo tramo de la semana anterior.

- `?limit=5` limita el resultado entre 1 y 10 productos.
- Devuelve `slug`, `title`, `views`, `previousViews` y `changePercentage`.
- La consulta se conserva en memoria durante cinco minutos por dominio y semana para evitar llamadas repetidas a Google Analytics.

Para habilitar Analytics se requieren estas variables de entorno:

```env
GOOGLE_ANALYTICS_PROPERTY_ID=123456789
GOOGLE_ANALYTICS_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_ANALYTICS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
```

La cuenta de servicio debe tener acceso de lector a la propiedad GA4 y debe estar habilitada Google Analytics Data API. Alternativamente, se puede usar `GOOGLE_APPLICATION_CREDENTIALS` con la ruta al JSON de la cuenta de servicio.
 

# config-store

## Resumen del dashboard

`GET /api/dashboard/summary` recibe el dominio en el header `domain` y consulta las órdenes reales del negocio.

- Sin parámetros, resume el día actual en `America/Lima`.
- `?date=YYYY-MM-DD` consulta un solo día.
- `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` consulta un rango inclusivo.

La respuesta incluye ingresos confirmados, pedidos, variación contra el período anterior equivalente y los estados de pago. El tráfico usa Google Analytics Data API y cuenta `screenPageViews` para la ruta de inicio. Se puede cambiar con `?pagePath=/ruta`; por defecto usa `/` o `GOOGLE_ANALYTICS_HOME_PATH`.

Para habilitar Analytics se requieren estas variables de entorno:

```env
GOOGLE_ANALYTICS_PROPERTY_ID=123456789
GOOGLE_ANALYTICS_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_ANALYTICS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
```

La cuenta de servicio debe tener acceso de lector a la propiedad GA4 y debe estar habilitada Google Analytics Data API. Alternativamente, se puede usar `GOOGLE_APPLICATION_CREDENTIALS` con la ruta al JSON de la cuenta de servicio.
 

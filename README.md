# Tunio — Web (Angular)

Aplicación web de **Tunio**, un sistema de solicitud musical colaborativa para bares y discotecas. Incluye el login del personal, la pantalla del bar con el reproductor, el panel de administración y el tablero analítico.

La web consume la API del backend de Tunio (NestJS), que debe estar en ejecución.

## Requisitos

- [Node.js](https://nodejs.org/) 18.19 o superior (se recomienda la versión LTS) y npm
- Backend de Tunio corriendo en `http://localhost:3000`
- Google Chrome (para ejecutar las pruebas)

## Instalación

```bash
git clone https://github.com/Julianaramirez939/Tunio-frontend.git
cd Tunio-frontend
npm install
```

## Ejecución

1. Levanta primero el backend (desde su repositorio):

   ```bash
   docker compose up -d
   npm run seed
   npm run start:dev
   ```

2. Inicia la web:

   ```bash
   npm start
   ```

3. Abre `http://localhost:4200`.

> **Puerto:** la web debe correr en el **4200**, el único origen que permite el CORS del backend. Si lo cambias, actualiza también `CORS_ORIGINS` en el `.env` del backend.

## Configuración

La URL del backend está en `src/environments/environment.ts`:

```ts
export const environment = {
  apiUrl: 'http://localhost:3000',
  timezone: 'America/Bogota',
};
```

## Usuarios de prueba

Los crea el `seed` del backend (por ejemplo `admin@taberna-el-faro.test` y `dj@taberna-el-faro.test`). La contraseña es la que esté en `SEED_STAFF_PASSWORD` en el `.env` del backend.

## Comandos

| Comando | Descripción |
|---|---|
| `npm start` | Servidor de desarrollo en `http://localhost:4200` |
| `npm run build` | Compilación de producción en `dist/` |
| `npm test` | Pruebas unitarias (Karma + Jasmine) |

## Documentación

El detalle del proyecto y de la API está en la carpeta `docs/` (ver `docs/07-API-ENDPOINTS.md`).

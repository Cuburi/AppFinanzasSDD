# Tech Stack - AppFinanzas

## Propósito del Proyecto

> **IMPORTANTE**: Este proyecto es una herramienta de estudio y aprendizaje personal. El agente debe proporcionar explicaciones detalladas, contexto técnico y razones detrás de las decisiones de implementación cuando se le solicite.

---

## Stack Tecnológico

### Frontend
- **React 18** - Librería UI
- **React Router v6** - Gestión de rutas
- **Vite** - Framework de estilos
- **TypeScript** - Cliente HTTP

### Backend
- **Node.js** - Runtime
- **Express** - Framework web
- **TypeScript**

### Autenticacion
- **better-auth** - Autenticación (email/password, sessions)
- **better-auth/express** - Integración con Express

### Base de Datos
- **PostgreSQL** - Base de datos relacional
- **Prisma** - ORM

### Reportes
- **jsPDF** - Generación de PDFs
- **html2canvas** - Captura de HTML para PDFs

### Despliegue
- **Railway** - Hosting de la aplicación completa

---

## Estructura del Proyecto

```
/appfinanzas
├── /client          # React frontend
│   ├── /src
│   │   ├── /components
│   │   ├── /pages
│   │   ├── /hooks
│   │   └── /lib
│   └── package.json
│
├── /server          # Express backend
│   ├── /src
│   │   ├── /routes
│   │   ├── /controllers
│   │   ├── /services
│   │   └── /middleware
│   └── package.json
│
└── /prisma          # Schema de base de datos
```

---

## Configuración de Autenticación (better-auth)

### Backend (Express)

```typescript
// server/src/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
});
```

```typescript
// server/src/index.ts
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";

const app = express();

app.all("/api/auth/*", toNodeHandler(auth));
app.use(express.json());

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
```

### Frontend (React)

```typescript
// client/src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000/api/auth",
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

---

## Notas de Implementación

- El backend y frontend son aplicaciones separadas
- Comunicación via API REST
- PostgreSQL para almacenamiento de datos
- Prisma como ORM para type-safety
- Railway para despliegue (backend + frontend o分开)

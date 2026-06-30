# Documento de Diseño - Préstamos ACEUCA

**El Mossad**  
**Fecha:** 27/05/2026

---

## Índice

1. [Diagrama de Casos de Uso Extendido a Segundo Nivel](#diagrama-de-casos-de-uso-extendido-a-segundo-nivel)
2. [Especificaciones de Casos de Uso](#especificaciones-de-casos-de-uso)
   - [CU-01: Autenticar y acceder](#cu-01-autenticar-y-acceder)
   - [CU-02: Gestionar solicitudes de préstamo](#cu-02-gestionar-solicitudes-de-préstamo)
   - [CU-03: Evaluar y aprobar préstamos](#cu-03-evaluar-y-aprobar-préstamos)
   - [CU-04: Gestión de pagos](#cu-04-gestión-de-pagos)
   - [CU-05: Administrar reportes](#cu-05-administrar-reportes)
   - [CU-06: Administrar reportes (Duplicado)](#cu-06-administrar-reportes-duplicado)
   - [CU-07: Enviar notificaciones](#cu-07-enviar-notificaciones)
   - [CU-08: Gestionar usuarios y seguridad](#cu-08-gestionar-usuarios-y-seguridad)
3. [Diagramas de Flujo de Datos](#diagramas-de-flujo-de-datos)
   - [Diagrama de Flujo de Datos de Contexto](#diagrama-de-flujo-de-datos-de-contexto)
   - [Diagrama de Flujo de Datos Nivel 1](#diagrama-de-flujo-de-datos-nivel-1)
   - [Diagramas de Flujo de Datos Hijo](#diagramas-de-flujo-de-datos-hijo)

---

## Diagrama de Casos de Uso Extendido a Segundo Nivel

*(Espacio reservado para el diagrama)*

---

## Especificaciones de Casos de Uso

### CU-01: Autenticar y acceder

| **Caso de Uso** | Autenticar y acceder | **CU-01** |
|-----------------|----------------------|-----------|
| **Actores**     | Asociado, Contador, Consejo, Administrador |
| **Tipo**        | Primario |
| **Referencias** | REQ-1: El sistema debe exigir un nombre de usuario y una contraseña única para permitir acceso a la plataforma. |
| **Precondición**| El usuario debe estar registrado y tener credenciales válidas. |
| **Postcondición**| Usuario autenticado con permisos según rol. |
| **Autor**       | Alejandro Orellana |
| **Fecha**       | 25/5/2026 |
| **Versión**     | 1.0 |

#### Propósito
Permitir el acceso seguro al sistema validando las credenciales del usuario y habilitando funciones según permisos asignados.

#### Resumen
Todos los usuarios autorizados pueden ingresar al sistema utilizando sus credenciales institucionales.

#### Curso Normal
| Nro. | Ejecutor | Paso o Actividad |
|------|----------|-------------------|
| 1    | Usuario  | Ingresa usuario. |
| 2    | Usuario  | Ingresa contraseña. |
| 3    | Sistema  | Valida credenciales. |
| 4    | Sistema  | Identifica rol asignado. |
| 5    | Sistema  | Habilita funcionalidades permitidas. |
| 6    | Sistema  | Permite acceso. |

#### Curso Alterno
| Nro. | Ejecutor | Paso o Actividad |
|------|----------|-------------------|
| 1    | Sistema  | Usuario ingresa credenciales incorrectas. |
| 2    | Sistema  | Rechaza autenticación. |
| 3    | Sistema  | Usuario no registrado. |
| 4    | Sistema  | Bloquea ingreso y muestra mensaje. |

---

### CU-02: Gestionar solicitudes de préstamo

| **Caso de Uso** | Gestionar solicitudes de préstamo | **CU-02** |
|-----------------|-----------------------------------|-----------|
| **Actores**     | Asociado, Asociado primera línea |
| **Tipo**        | Primario |
| **Referencias** | REQ-2, REQ-5, REQ-9, REQ-12, REQ-20, REQ-21 |
| **Precondición**| El usuario debe haber iniciado sesión exitosamente. |
| **Postcondición**| Solicitud registrada como "Pendiente", con datos financieros y archivos adjuntos. |
| **Autor**       | Diego Hurtado |
| **Fecha**       | 25/5/2026 |
| **Versión**     | 1.0 |

#### Propósito
Permitir guardar solicitudes digitalmente, validando condiciones de cada tipo de crédito, capacidad de pago y documentos.

#### Resumen
El asociado accede al formulario, selecciona tipo de préstamo, ingresa monto y plazo, adjunta archivos. El sistema valida, calcula, evalúa historial crediticio y determina viabilidad.

#### Curso Normal
| Nro. | Ejecutor | Paso o Actividad |
|------|----------|-------------------|
| 1    | Usuario  | Ingresa usuario y contraseña. |
| 2    | Usuario  | Selecciona opción de registro de nuevas solicitudes. |
| 3    | Usuario  | Elige tipo de préstamo, ingresa monto y plazo. |
| 4    | Usuario  | Adjunta copias digitales. |
| 5    | Sistema  | Verifica formato, consulta historial crediticio, sugiere montos, evalúa reglas. |
| 6    | Sistema  | Registra solicitud como "Pendiente". |

#### Curso Alterno
| Nro. | Ejecutor | Paso o Actividad |
|------|----------|-------------------|
| 1    | Sistema  | En la evaluación, retorna calificación negativa. |
| 2    | Sistema  | Interrumpe el flujo y bloquea la solicitud. |
| 3    | Sistema  | Despliega motivo del bloqueo. |
| 4    | Sistema  | Muestra instrucciones para apelar. |

---

### CU-03: Evaluar y aprobar préstamos

| **Caso de Uso** | Evaluar y aprobar préstamos | **CU-03** |
|-----------------|-----------------------------|-----------|
| **Actores**     | Contador, Consejo |
| **Tipo**        | Primario |
| **Referencias** | REQ-2, REQ-3, REQ-5, REQ-6, REQ-7, REQ-8, REQ-13, REQ-21, REQ-23 |
| **Precondición**| Debe existir una solicitud registrada. |
| **Postcondición**| Solicitud aprobada, rechazada o desembolsada. |
| **Autor**       | Sofia Recinos |
| **Fecha**       | 26/05/2026 |
| **Versión**     | 1 |

#### Propósito
Permite al contador y consejo evaluar las solicitudes de préstamo.

#### Resumen
Los responsables revisan solicitudes y toman decisiones sobre la aprobación.

#### Curso Normal
| Nro. | Ejecutor | Paso o Actividad |
|------|----------|-------------------|
| 1    | Contador | Consulta solicitudes pendientes. |
| 2    | Sistema  | Muestra información financiera. |
| 3    | Sistema  | Presenta historial crediticio. |
| 4    | Sistema  | Genera tabla de amortización. |
| 5    | Sistema  | Genera calendario de pagos. |
| 6    | Contador | Revisa cumplimiento de políticas. |
| 7    | Consejo  | Evalúa solicitud. |
| 8    | Consejo  | Aprueba préstamo. |
| 9    | Sistema  | Actualiza estado a "Aprobado". |
| 10   | Sistema  | Registra desembolso. |
| 11   | Sistema  | Actualiza historial. |
| 12   | Sistema  | Notifica resultado. |

#### Cursos Alternos
| Nro. | Ejecutor | Descripción de acciones alternas |
|------|----------|-----------------------------------|
| 1    | Sistema  | Detecta alto riesgo crediticio. |
| 2    | Sistema  | Solicitud bloqueada automáticamente. |
| 3    | Asociado | Presenta apelación. |
| 4    | Consejo  | Realiza revisión excepcional. |
| 5    | Asociado | Solicita congelamiento. |
| 6    | Sistema  | Extiende automáticamente plazo. |
| 7    | Asociado | Presenta reducción comprobada de ingresos. |
| 8    | Sistema  | Ejecuta reestructuración. |
| 9    | Sistema  | Falta fiador obligatorio. |
| 10   | Sistema  | No permite continuar. |

---

### CU-04: Gestión de pagos

| **Caso de Uso** | Gestión de pagos | **CU-04** |
|-----------------|------------------|-----------|
| **Actores**     | Contador, Asociado |
| **Tipo**        | Primario |
| **Referencias** | REQ-3, REQ-4, REQ-5, REQ-6, REQ-10, REQ-15, REQ-18, REQ-19, REQ-22, REQ-24 |
| **Precondición**| Debe existir un préstamo activo y cuotas registradas. |
| **Postcondición**| Pago registrado, saldo actualizado y comprobante generado. |
| **Autor**       | Sofia Recinos |
| **Fecha**       | 26/05/2026 |
| **Versión**     | 1 |

#### Propósito
Permite al asociado realizar pagos o abonos, actualizar saldos y generar comprobantes. Al contador, administrar y registrar pagos.

#### Resumen
El usuario accede al módulo de reportes, selecciona el tipo de reporte y el sistema muestra información actualizada.

#### Curso Normal
| Nro. | Ejecutor | Paso o Actividad |
|------|----------|-------------------|
| 1    | Asociado | Selecciona el préstamo a pagar. |
| 2    | Sistema  | Muestra el saldo pendiente. |
| 3    | Sistema/Contador | Ingresa el monto de pago. |
| 4    | Sistema/Contador | Selecciona el tipo de pago. |
| 5    | Sistema  | Valida información del pago. |
| 6    | Contador | Verifica si existe mora. |
| 7    | Consejo  | Calcula recargo correspondiente. |
| 8    | Sistema  | Actualiza saldo del préstamo. |
| 9    | Sistema  | Registra transacción del pago. |
| 10   | Sistema  | Genera comprobante digital y factura electrónica. |
| 11   | Sistema  | Asigna identificador único. |
| 12   | Sistema  | Notifica del pago realizado. |
| 13   | Contador/Sistema | Realiza reporte del pago. |

#### Cursos Alternos
| Nro. | Ejecutor | Descripción de acciones alternas |
|------|----------|-----------------------------------|
| 1    | Asociado | Ingresa el monto a pagar. |
| 2    | Sistema  | Rechaza el pago. |
| 3    | Sistema  | El pago excede el saldo pendiente. |
| 4    | Sistema  | Notifica del excedente para retirarlo. |
| 5    | Sistema  | El pago fue realizado fuera de la fecha. |
| 6    | Sistema  | Aplica mora automáticamente. |
| 7    | Sistema  | Error al generar el comprobante. |
| 8    | Sistema  | Notifica fallo al contador. |

---

### CU-05: Administrar reportes

| **Caso de Uso** | Administrar reportes | **CU-05** |
|-----------------|----------------------|-----------|
| **Actores**     | Contador, Consejo, Asociado |
| **Tipo**        | Primario |
| **Referencias** | REQ-3, REQ-8, REQ-10, REQ-11, REQ-13, REQ-15, REQ-16, REQ-19, REQ-23 |
| **Precondición**| Usuario autenticado con permiso de acceso. |
| **Postcondición**| Reporte visualizado y disponible para exportación. |
| **Autor**       | Marcos Caballero |
| **Fecha**       | 26/05/2026 |
| **Versión**     | 1 |

#### Propósito
Permite consultar y exportar reportes actualizados en tiempo real sobre préstamos, pagos, mora y estados financieros.

#### Resumen
El usuario accede al módulo de reportes, selecciona el tipo de reporte y el sistema muestra la información actualizada.

#### Curso Normal
| Nro. | Ejecutor | Paso o Actividad |
|------|----------|-------------------|
| 1    | Contador, Consejo, Asociado | Ingresa al módulo de reportes. |
| 2    | Sistema  | Muestra los tipos de reporte disponibles. |
| 3    | Contador, Consejo, Asociado | Selecciona reporte a consultar. |
| 4    | Sistema  | Genera reporte en tiempo real. |
| 5    | Sistema  | Muestra el reporte al usuario. |
| 6    | Contador, Consejo, Asociado | Selecciona el formato de exportación. |
| 7    | Sistema  | Exporta el reporte en PDF o Excel. |
| 8    | Sistema  | Confirma exportación exitosa. |

#### Cursos Alternos
| Nro. | Ejecutor | Descripción de acciones alternas |
|------|----------|-----------------------------------|
| 1    | Asociado/Contador/Consejo | Busca reportes sobre pagos realizados. |
| 2    | Sistema  | Deniega los permisos de acceso. |
| 3    | Sistema  | No existen datos disponibles. |
| 4    | Sistema  | Muestra mensaje de información no disponible. |
| 5    | Sistema  | Error durante la exportación. |
| 6    | Sistema  | Notifica fallo en exportación. |

---

### CU-06: Administrar reportes (Duplicado)

> **Nota:** Este caso de uso es una versión duplicada del CU-05. Se recomienda consolidar en una única especificación.

| **Caso de Uso** | Administrar reportes | **CU-06** |
|-----------------|----------------------|-----------|
| **Actores**     | Asociado, Contador, Consejo |
| **Tipo**        | Primario |
| **Referencias** | REQ-11, REQ-15, REQ-16 |
| **Precondición**| Usuario autenticado con rol autorizado. |
| **Postcondición**| Información financiera desplegada y disponible para descarga. |
| **Autor**       | Diego Hurtado |
| **Fecha**       | 25/5/2026 |
| **Versión**     | 1.0 |

#### Propósito
Permite a asociados y personal administrativo consultar, visualizar y exportar reportes financieros en tiempo real.

#### Resumen
El actor ingresa al módulo de reportes, selecciona el tipo de consulta según su rol, visualiza y exporta el resultado.

#### Curso Normal
| Nro. | Ejecutor | Paso o Actividad |
|------|----------|-------------------|
| 1    | Usuario  | Accede a "reportes y consultas". |
| 2    | Sistema  | Despliega opciones según rol. |
| 3    | Usuario  | Selecciona el tipo de reporte. |
| 4    | Sistema  | Consulta y muestra información en tiempo real. |
| 5    | Usuario  | Solicita descarga en formato deseado. |
| 6    | Sistema  | Genera y entrega el archivo descargable. |

#### Curso Alterno
| Nro. | Ejecutor | Paso o Actividad |
|------|----------|-------------------|
| 1    | Sistema  | En la evaluación, retorna calificación negativa. |
| 2    | Sistema  | Interrumpe el flujo y bloquea la solicitud. |
| 3    | Sistema  | Despliega motivo. |
| 4    | Sistema  | Muestra instrucciones para apelar. |

---

### CU-07: Enviar notificaciones

| **Caso de Uso** | Enviar notificaciones | **CU-07** |
|-----------------|------------------------|-----------|
| **Actores**     | Asociado, Contador, Consejo |
| **Tipo**        | Secundario |
| **Referencias** | REQ-2, REQ-10, REQ-12, REQ-19 |
| **Precondición**| Ocurrencia de un evento disparador en el sistema. |
| **Postcondición**| Notificación enviada y disponible para el actor correspondiente. |
| **Autor**       | Javier Salamanca |
| **Fecha**       | 25/5/2026 |
| **Versión**     | 1.0 |

#### Propósito
Informar de manera automática a los interesados sobre resultados de procesos financieros.

#### Resumen
El sistema comunica estados, resoluciones y alertas a los actores pertinentes tras cualquier cambio.

#### Curso Normal
| Nro. | Ejecutor | Paso o Actividad |
|------|----------|-------------------|
| 1    | Asociado, Contador, Consejo | Realiza una acción (ej. solicitud, pago). |
| 2    | Sistema  | Identifica el evento y consulta datos. |
| 3    | Sistema  | Determina los destinatarios. |
| 4    | Sistema  | Recupera plantilla predefinida. |
| 5    | Sistema  | Personaliza el mensaje. |
| 6    | Sistema  | Envía la notificación al panel del receptor. |
| 7    | Actor    | Accede y visualiza la notificación. |
| 8    | Sistema  | Marca como entregada y guarda log. |

#### Curso Alterno
| Nro. | Ejecutor | Paso o Actividad |
|------|----------|-------------------|
| 1    | Sistema  | Detecta falta de conexión del usuario. |
| 2    | Sistema  | Pone el mensaje en cola de pendientes. |
| 3    | Sistema  | Destinatario se conecta tras inactividad. |
| 4    | Sistema  | Bloquea ingreso y muestra mensaje. |
| 5    | Sistema  | Error crítico en el servidor. |
| 6    | Sistema  | Registra error y notifica al administrador. |

---

### CU-08: Gestionar usuarios y seguridad

| **Caso de Uso** | Gestionar usuarios y seguridad | **CU-08** |
|-----------------|--------------------------------|-----------|
| **Actores**     | Administrador |
| **Tipo**        | Primario |
| **Referencias** | REQ-1, REQ-17, REQ-20, REQ-21 |
| **Precondición**| Administrador autenticado con privilegios de superusuario. |
| **Postcondición**| Registro de usuarios actualizado y nuevas políticas aplicadas. |
| **Autor**       | Javier Salamanca |
| **Fecha**       | 25/5/2026 |
| **Versión**     | 1.0 |

#### Propósito
Gestionar el ciclo de vida de los usuarios y configurar parámetros de seguridad globales.

#### Resumen
El administrador gestiona usuarios, roles y políticas de seguridad.

#### Curso Normal
| Nro. | Ejecutor | Paso o Actividad |
|------|----------|-------------------|
| 1    | Administrador | Ingresa al módulo de Administración y Seguridad. |
| 2    | Sistema  | Despliega catálogo de usuarios y panel de configuración. |
| 3    | Administrador | Selecciona acción: Crear, Editar, Desactivar o Ajustar política. |
| 4    | Administrador | Ingresa datos, asigna rol y define permisos. |
| 5    | Sistema  | Valida unicidad, integridad y permisos. |
| 6    | Sistema  | Guarda cambios y cifra credenciales. |
| 7    | Sistema  | Registra evento en bitácora de auditoría. |
| 8    | Sistema  | Notifica al administrador la operación exitosa. |

#### Curso Alterno
| Nro. | Ejecutor | Paso o Actividad |
|------|----------|-------------------|
| 1    | Sistema  | Detecta inconsistencia o roles duplicados. |
| 2    | Sistema  | Muestra error y solicita corrección. |
| 3    | Administrador | Intenta asignar permisos superiores a su nivel. |
| 4    | Sistema  | Bloquea la acción y genera alerta de seguridad. |

---

## Diagramas de Flujo de Datos

### Diagrama de Flujo de Datos de Contexto

*(Espacio reservado para el diagrama)*

---

### Diagrama de Flujo de Datos Nivel 1

*(Espacio reservado para el diagrama)*

---

### Diagramas de Flujo de Datos Hijo

#### Proceso 1 - Alejandro Orellana

*(Espacio reservado para el diagrama)*

#### Proceso 2 - Diego Hurtado

*(Espacio reservado para el diagrama)*

#### Proceso 3 - Sofia Recinos

*(Espacio reservado para el diagrama)*

#### Proceso 4 - Sofia Recinos

*(Espacio reservado para el diagrama)*

#### Proceso 5 - Sofia Recinos

*(Espacio reservado para el diagrama)*

#### Proceso 6 - Diego Hurtado

*(Espacio reservado para el diagrama)*

#### Proceso 7 - Javier Salamanca

*(Espacio reservado para el diagrama)*

#### Proceso 8 - Javier Salamanca

*(Espacio reservado para el diagrama)*

---

**Fin del documento**
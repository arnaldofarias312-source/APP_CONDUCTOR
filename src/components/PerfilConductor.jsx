/**
 * Muestra el módulo con los datos detallados del conductor.
 *
 * Props:
 *  - conductorInfo: { id, nombre, apellido, cedula, linea_nombre, linea_color, lineas_autorizadas }
 *  - autobusSeleccionado: { id, identificador, lineas } | null
 */
export default function PerfilConductor({ conductorInfo, autobusSeleccionado }) {
  if (!conductorInfo) return null

  // Evaluamos únicamente el campo 'cedula' proveniente de Supabase
  const cedulaRaw = conductorInfo.cedula || conductorInfo.cedula_identidad || conductorInfo.ci

  // Formateador con puntos de miles (ej: 28.123.456)
  const formatearCedula = (val) => {
    if (!val) return null
    const num = String(val).replace(/\D/g, '')
    return num ? new Intl.NumberFormat('es-VE').format(num) : null
  }

  const cedulaFormateada = formatearCedula(cedulaRaw)

  return (
    <div className="perfil-card">
      <div className="perfil-header">
        <div className="perfil-avatar">👤</div>
        <h2>{conductorInfo.nombre} {conductorInfo.apellido}</h2>
        <span className="badge badge--conductor">Conductor Registrado</span>
      </div>

      <div className="perfil-detalles">
        <div className="perfil-item">
          <small>Cédula de Identidad</small>
          <strong>
            {cedulaFormateada
              ? `V- ${cedulaFormateada}`
              : 'No posee cédula'}
          </strong>
        </div>

        <div className="perfil-item">
          <small>{conductorInfo.lineas_autorizadas?.length > 1 ? 'Líneas Asignadas' : 'Línea / Ruta Asignada'}</small>
          <strong>
            {conductorInfo.lineas_autorizadas && conductorInfo.lineas_autorizadas.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', marginTop: '2px' }}>
                {conductorInfo.lineas_autorizadas.map((l) => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      className="bienvenida-punto"
                      style={{ backgroundColor: l.color_hex || '#0b3d91' }}
                    />
                    <span>{l.nombre}</span>
                  </div>
                ))}
              </div>
            ) : conductorInfo.linea_nombre ? (
              <>
                <span
                  className="bienvenida-punto"
                  style={{ backgroundColor: conductorInfo.linea_color || '#0b3d91' }}
                />
                {' '}{conductorInfo.linea_nombre}
              </>
            ) : (
              'Sin línea asignada'
            )}
          </strong>
        </div>

        <div className="perfil-item">
          <small>Unidad / Autobús en Turno</small>
          <strong>
            {autobusSeleccionado?.identificador ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span>🚌 {autobusSeleccionado.identificador}</span>
                <span className="badge badge--activa" style={{ fontSize: '11px', padding: '3px 8px' }}>
                  ✓ En uso
                </span>
              </div>
            ) : (
              <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 400 }}>
                Sin unidad escaneada hoy
              </span>
            )}
          </strong>
        </div>
      </div>
    </div>
  )
}

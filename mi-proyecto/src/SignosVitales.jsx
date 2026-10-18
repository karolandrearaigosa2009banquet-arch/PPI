// Valores de referencia generales para personas adultas en reposo.
const SIGNOS = [
  { id: 'corazon', icono: '❤️', latido: true, nombre: 'Frecuencia cardíaca', valor: '60 – 100', unidad: 'latidos por minuto', nota: 'Pulso en reposo' },
  { id: 'presion', icono: '🩺', nombre: 'Presión arterial', valor: '< 120 / 80', unidad: 'mmHg', nota: 'Sistólica / diastólica' },
  { id: 'respiracion', icono: '🌬️', nombre: 'Frecuencia respiratoria', valor: '12 – 20', unidad: 'respiraciones por minuto', nota: 'En reposo' },
  { id: 'temperatura', icono: '🌡️', nombre: 'Temperatura corporal', valor: '36,1 – 37,2', unidad: '°C', nota: 'Medida en la axila u oído' },
  { id: 'oxigeno', icono: 'O₂', nombre: 'Saturación de oxígeno', valor: '95 – 100', unidad: '%', nota: 'Medida con oxímetro' },
]

export default function SignosVitales() {
  return (
    <section className="content-card vitales" aria-labelledby="titulo-vitales">
      <div className="vitales-cabecera">
        <div>
          <span className="kicker">Salud</span>
          <h2 id="titulo-vitales">Signos vitales</h2>
          <p className="muted">Valores de referencia para personas adultas en reposo.</p>
        </div>
        <svg className="vitales-ecg" viewBox="0 0 260 60" preserveAspectRatio="none" aria-hidden="true">
          <polyline points="0,32 70,32 88,32 100,10 114,54 128,20 138,32 260,32" />
        </svg>
      </div>

      <div className="vitales-grid">
        {SIGNOS.map((signo) => (
          <article className="vital" key={signo.id}>
            <span className={`vital-icono${signo.latido ? ' vital-latido' : ''}`} aria-hidden="true">{signo.icono}</span>
            <h3>{signo.nombre}</h3>
            <p className="vital-valor">{signo.valor}</p>
            <p className="vital-unidad">{signo.unidad}</p>
            <small>{signo.nota}</small>
          </article>
        ))}
      </div>

      <p className="vitales-aviso">
        Son valores generales para adultos sanos y pueden cambiar según la edad y la condición de cada persona.
        No reemplazan una consulta médica: si tienes síntomas o dudas, acude a tu centro de salud.
      </p>
    </section>
  )
}

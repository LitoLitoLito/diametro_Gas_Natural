// ========================= VARIABLES GLOBALES =========================
let tablaDatos = [];
let consumosAcumulados = [];
let totalConsumo = 0;
let todosLosRegistros = [];            // Tramos predimensionados (sin equivalentes)
let indiceTramoActual = 0;             // Para el flujo de equivalentes
let accesoriosAcumulados = [];         // Accesorios del tramo actual (equivalentes)
let totalEquivalente = 0;              // mm del tramo actual
let tramosConEquivalente = [];         // Tramos con sus accesorios/equivalentes
let accesorioSeleccionado = null;

// ========================= INICIALIZACIÓN =========================
document.addEventListener('DOMContentLoaded', () => {
    // Ocultar secciones que no van al inicio
    byId('lista-tramos-section').style.display = 'none';
    byId('resumen-final-section').style.display = 'none';
    byId('consumos-agregados').style.display = 'none';
    byId('equivalente-section').style.display = 'none';
    byId('resultado-equivalente-section').style.display = 'none';
    byId('cargando-datos').style.display = 'block';

    cargarDatosTabla().finally(() => {
        byId('cargando-datos').style.display = 'none';
        configurarEventos();
        configurarEventosModal();
    });
});

// ========================= UTILIDADES BÁSICAS =========================
function byId(id){ return document.getElementById(id); }

function mostrarMensaje(msg, tipo='info') {
    // Simple y efectivo. Si querés toasts, después le metemos un componente.
    const prefix = { info:'ℹ️', success:'✅', warning:'⚠️', error:'❌' }[tipo] || 'ℹ️';
    console.log(`${prefix} ${msg}`);
    alert(`${prefix} ${msg}`);
}

function mostrarConfirmacion(msg, onOk) {
    if (confirm(msg)) onOk?.();
}

// ========================= MODAL DE ACCESORIOS =========================
function configurarEventosModal() {
    const closeBtn = document.querySelector('#modal-diametro .close-modal');
    if (closeBtn) closeBtn.addEventListener('click', cerrarModal);
    const confirmar = byId('confirmar-diametro-btn');
    if (confirmar) confirmar.addEventListener('click', confirmarAccesorio);
}

function abrirModal() {
    byId('nombre-accesorio-modal').textContent = accesorioSeleccionado.nombre;
    byId('diametro-accesorio').value = '';

    // sugerencia de diámetro (del tramo actual)
    const anterior = document.querySelector('.diametro-sugerido');
    if (anterior) anterior.remove();

    const tramoActual = todosLosRegistros[indiceTramoActual];
    if (tramoActual && tramoActual.diametro) {
        const p = document.createElement('p');
        p.className = 'diametro-sugerido';
        p.textContent = `Diámetro sugerido para este tramo: ${tramoActual.diametro}`;
        document.querySelector('#modal-diametro .modal-content').appendChild(p);
    }

    byId('modal-diametro').classList.add('is-active');
}
function cerrarModal() { byId('modal-diametro').classList.remove('is-active'); }

// ========================= CARGA DE TABLA JSON =========================
async function cargarDatosTabla() {
    try {
        const resp = await fetch('./data/convertcsv.json');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const datosCrudos = await resp.json();
        tablaDatos = transformarDatos(datosCrudos);
        console.log('Tabla cargada:', tablaDatos);
    } catch (e) {
        console.error(e);
        mostrarMensaje('Error al cargar los datos de la tabla. Recargá la página.', 'error');
    }
}
function transformarDatos(datosCrudos) {
    const columnas = datosCrudos[0];
    return datosCrudos.slice(1).map(fila => {
        const obj = {};
        for (const key in columnas) {
            const nombreCol = columnas[key];
            obj[nombreCol] = isNaN(fila[key]) ? fila[key] : Number(fila[key]);
        }
        return obj;
    });
}

// ========================= EVENTOS (FORM PRINCIPAL) =========================
function configurarEventos() {
    // Agregar consumo simple (suma al acumulado)
    byId('agregar-consumo-btn').addEventListener('click', () => {
        const v = parseFloat(byId('tramo-consumo').value);
        if (isNaN(v)) return mostrarMensaje('Ingrese un valor numérico válido para el consumo', 'warning');
        if (v <= 0)  return mostrarMensaje('El consumo debe ser mayor que 0', 'warning');
        consumosAcumulados.push(v);
        totalConsumo += v;
        actualizarListaConsumos();
        byId('tramo-consumo').value = '';
    });

    // Agregar tramo (mostrar inmediatamente el último)
    byId('agregar-tramo-btn').addEventListener('click', () => {
        if (tablaDatos.length === 0) {
            return mostrarMensaje('La tabla aún no se cargó. Espere un instante.', 'info');
        }

        const nombreTramo = (byId('tramo-nombre').value || '').trim() || 'Sin nombre';
        const longitudReal = parseFloat(byId('tramo-longitud').value) || 0;
        if (longitudReal <= 0) return mostrarMensaje('Ingrese una longitud válida (> 0)', 'warning');

        let consumoTotal = 0;
        if (consumosAcumulados.length > 0) {
            consumoTotal = totalConsumo;
        } else {
            const unico = parseFloat(byId('tramo-consumo').value) || 0;
            if (unico <= 0) return mostrarMensaje('Ingrese al menos un consumo válido', 'warning');
            consumoTotal = unico;
        }

        const resultados = calcularDiametroPredimensionado(nombreTramo, longitudReal, consumoTotal);
        todosLosRegistros.push(resultados);

        // Mostrar la sección + render inmediato del último tramo
        byId('lista-tramos-section').style.display = 'block';
        appendUltimoTramo(resultados);   // <— muestra el tramo recién ingresado

        // Limpiar formulario para seguir cargando
        byId('tramo-nombre').value = '';
        byId('tramo-longitud').value = '';
        byId('tramo-consumo').value = '';
        consumosAcumulados = [];
        totalConsumo = 0;
        byId('lista-consumos').innerHTML = '';
        byId('total-consumo').textContent = '0';
        byId('consumos-agregados').style.display = 'none';

        mostrarMensaje('Tramo agregado correctamente', 'success');
    });

    // Finalizar tramos → pasar a equivalentes
    byId('finalizar-tramos-btn').addEventListener('click', () => {
        if (todosLosRegistros.length === 0) {
            return mostrarMensaje('Agregue al menos un tramo antes de continuar', 'warning');
        }
        byId('formulario-tramo-section').style.display = 'none';
        byId('lista-tramos-section').style.display = 'block';
        iniciarCalculoEquivalente();
    });

    byId('cancelar-btn').addEventListener('click', () => {
        mostrarConfirmacion('¿Cancelar? Se perderán los datos ingresados.', reiniciarFormulario);
    });
    byId('cancelar-equivalente-btn').addEventListener('click', () => {
        mostrarConfirmacion('¿Cancelar? Se perderán los datos ingresados.', reiniciarFormulario);
    });

    byId('descargar-pdf-btn').addEventListener('click', generarPDFCompleto);
    byId('descargar-csv-btn').addEventListener('click', descargarDatos);
    byId('copiar-btn').addEventListener('click', copiarDatos);
    byId('nuevo-calculo-btn').addEventListener('click', () => {
        mostrarConfirmacion('¿Nuevo cálculo? Se borrarán los datos actuales.', reiniciarFormulario);
    });
}

// ========================= CÁLCULOS PRINCIPALES =========================
function calcularDiametroPredimensionado(nombreTramo, longitudReal, consumoTotal) {
    const caudalCalculo = (consumoTotal / 9300) * 1000; // m³/h
    const di = encontrarDiametro(caudalCalculo, longitudReal); // busca en tabla por longitud y caudal
    const diametroNumerico = parseFloat(String(di.columna).split(' ')[0].replace(',', '.'));
    return {
        nombreTramo,
        longitudReal,
        consumoTotal,
        caudalCalculo,
        diametro: di.columna,                      // ej: "20 mm"
        diametroNumerico: isNaN(diametroNumerico) ? 0 : diametroNumerico,
        valorCaudal: di.valor,                     // el valor de tabla usado
        fecha: new Date().toLocaleString()
    };
}

// Busca el valor superior en una columna
function encontrarValorSuperior(valor, columna) {
    const valores = tablaDatos.map(item => item[columna]).sort((a, b) => a - b);
    return valores.find(v => v >= valor) ?? valores[valores.length - 1];
}

// Busca el diámetro (columna) que cumple el caudal para la fila de longitud adecuada
function encontrarDiametro(caudal, longitudTabla, tolerancia = 0.0001) {
    // Fila cuya "longitud" es >= a la requerida (o la última)
    const fila = tablaDatos.find(f => parseFloat(f.longitud) >= longitudTabla) || tablaDatos[tablaDatos.length - 1];

    let columnaEncontrada = null;
    let valorEncontrado = null;

    // Recorre columnas (todas menos "longitud")
    for (const [columna, valor] of Object.entries(fila)) {
        if (columna === 'longitud') continue;
        const v = parseFloat(valor);
        if (v >= caudal) {
            columnaEncontrada = columna;
            valorEncontrado = v;
            break;
        }
    }

    // Si no encontró, tolera diferencias relativas pequeñas
    if (!columnaEncontrada) {
        for (const [columna, valor] of Object.entries(fila)) {
            if (columna === 'longitud') continue;
            const v = parseFloat(valor);
            if (Math.abs(v - caudal) / caudal <= tolerancia) {
                columnaEncontrada = columna;
                valorEncontrado = v;
                break;
            }
        }
    }

    // Si sigue sin encontrar, toma el mayor disponible
    if (!columnaEncontrada) {
        const cols = Object.entries(fila).filter(([c]) => c !== 'longitud');
        const ultima = cols[cols.length - 1];
        columnaEncontrada = ultima[0];
        valorEncontrado = parseFloat(ultima[1]);
    }

    // Normalizamos el nombre de columna a "NN mm" si fuese necesario
    const etiqueta = /^\d+(\,\d+)?\s*mm$/i.test(columnaEncontrada) ? columnaEncontrada : `${columnaEncontrada} mm`;
    return { columna: etiqueta, valor: valorEncontrado };
}

// ========================= UI (LISTAS Y RENDER) =========================
function actualizarListaConsumos() {
    const lista = byId('lista-consumos');
    lista.innerHTML = consumosAcumulados.map((c, i) => `<li>Consumo ${i + 1}: ${c} Kcal/h</li>`).join('');
    byId('total-consumo').textContent = String(totalConsumo);
    byId('consumos-agregados').style.display = 'block';
}

// Render completo de la tabla de tramos (si lo necesitás)
function actualizarListaTramos() {
    const cont = byId('lista-tramos');
    cont.innerHTML = `
        <h3>Tramos ingresados (${todosLosRegistros.length})</h3>
        <table>
            <thead>
                <tr>
                    <th>Tramo</th>
                    <th>Longitud (m)</th>
                    <th>Consumo (Kcal/h)</th>
                    <th>Caudal (m³/h)</th>
                    <th>Diámetro Predimensionado</th>
                </tr>
            </thead>
            <tbody>
                ${todosLosRegistros.map(t => `
                    <tr>
                        <td>${t.nombreTramo}</td>
                        <td>${t.longitudReal}</td>
                        <td>${t.consumoTotal}</td>
                        <td>${t.caudalCalculo.toFixed(2)}</td>
                        <td><strong>${t.diametro}</strong></td>
                    </tr>`).join('')}
            </tbody>
        </table>
    `;
}

// Render incremental del último tramo (lo que pediste)
function appendUltimoTramo(tramo) {
    // Si es el primero, creo toda la tabla; si no, solo agrego fila
    const cont = byId('lista-tramos');
    if (!cont.querySelector('table')) {
        actualizarListaTramos();
    } else {
        const tbody = cont.querySelector('tbody');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${tramo.nombreTramo}</td>
            <td>${tramo.longitudReal}</td>
            <td>${tramo.consumoTotal}</td>
            <td>${tramo.caudalCalculo.toFixed(2)}</td>
            <td><strong>${tramo.diametro}</strong></td>
        `;
        tbody.appendChild(tr);
    }

    // scroll a la última fila para "feedback" visual
    requestAnimationFrame(() => {
        const lastRow = cont.querySelector('tbody tr:last-child');
        lastRow?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
}

// ========================= FLUJO EQUIVALENTES =========================
function iniciarCalculoEquivalente() {
    indiceTramoActual = 0;
    byId('lista-tramos-section').style.display = 'none';
    byId('equivalente-section').style.display = 'block';
    mostrarTramoActual();
    configurarEventosAccesorios();
}

function mostrarTramoActual() {
    const tramo = todosLosRegistros[indiceTramoActual];
    byId('nombre-tramo-actual').textContent = tramo.nombreTramo;
    byId('diametro-predimensionado').textContent = tramo.diametro;

    // reset accesorios del tramo actual
    accesoriosAcumulados = [];
    totalEquivalente = 0;
    actualizarListaAccesorios();
}

function configurarEventosAccesorios() {
    // limpiar listeners duplicados
    document.querySelectorAll('.accesorio-btn').forEach(btn => btn.replaceWith(btn.cloneNode(true)));
    // agregar listeners
    document.querySelectorAll('.accesorio-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            accesorioSeleccionado = {
                nombre: this.dataset.nombre,
                valor: parseFloat(this.dataset.valor),
                id: Date.now() + Math.floor(Math.random() * 1000)
            };
            abrirModal();
        });
    });

    // Configurar botón para copiar accesorios
    const copiarBtn = byId('copiar-accesorios-btn');
    if (copiarBtn) {
        copiarBtn.onclick = mostrarModalSeleccionTramo;
    }

    const sig = byId('siguiente-tramo-btn');
    if (sig) sig.onclick = () => {
        guardarTramoEquivalente();
        indiceTramoActual++;
        if (indiceTramoActual >= todosLosRegistros.length) {
            indiceTramoActual = todosLosRegistros.length - 1;
            return mostrarMensaje('Ya estás en el último tramo.', 'info');
        }
        mostrarTramoActual();
    };

    const calc = byId('calcular-equivalente-btn');
    if (calc) calc.onclick = () => {
        guardarTramoEquivalente();
        calcularYMostrarEquivalente();
    };
}

function confirmarAccesorio() {
    const diametro = parseFloat(byId('diametro-accesorio').value);
    if (isNaN(diametro) || diametro <= 0) return mostrarMensaje('Ingrese un diámetro válido (> 0)', 'warning');

    if (diametro > 100) {
        return mostrarConfirmacion(
            `¿Seguro que el diámetro es ${diametro} mm? Los valores típicos suelen estar entre 6 dan 50 mm.`,
            () => procesarConfirmacionAccesorio(diametro)
        );
    }
    procesarConfirmacionAccesorio(diametro);
}

function procesarConfirmacionAccesorio(diametro) {
    const equivalente = accesorioSeleccionado.valor * diametro; // mm
    totalEquivalente += equivalente;

    accesoriosAcumulados.push({
        id: accesorioSeleccionado.id,
        nombre: accesorioSeleccionado.nombre,
        valor: equivalente.toFixed(2),
        diametroUsado: diametro,
        valorBase: accesorioSeleccionado.valor
    });

    actualizarListaAccesorios();
    cerrarModal();
}

function actualizarListaAccesorios() {
    const lista = byId('lista-accesorios');
    lista.innerHTML = accesoriosAcumulados.map(a => `
        <li>
            ${a.nombre} (${a.valorBase} × ${a.diametroUsado}mm): <strong>${a.valor} mm</strong>
            <button class="btn-eliminar-accesorio" data-id="${a.id}" title="Eliminar accesorio">×</button>
        </li>
    `).join('');

    byId('total-equivalente').textContent = totalEquivalente.toFixed(2);

    // listeners de eliminación
    document.querySelectorAll('.btn-eliminar-accesorio').forEach(btn => {
        btn.addEventListener('click', function () {
            const id = parseInt(this.dataset.id, 10);
            eliminarAccesorio(id);
        });
    });
}

function eliminarAccesorio(id) {
    const idx = accesoriosAcumulados.findIndex(a => a.id === id);
    if (idx !== -1) {
        totalEquivalente -= parseFloat(accesoriosAcumulados[idx].valor);
        accesoriosAcumulados.splice(idx, 1);
        actualizarListaAccesorios();
        mostrarMensaje('Accesorio eliminado.', 'success');
    }
}

function guardarTramoEquivalente() {
    const base = todosLosRegistros[indiceTramoActual];
    // Guardamos copia defensiva
    tramosConEquivalente.push({
        ...base,
        accesorios: accesoriosAcumulados.map(a => ({ ...a })), // copia
        totalEquivalenteMM: totalEquivalente,
        totalEquivalenteM: totalEquivalente / 1000
    });
}

function mostrarModalSeleccionTramo() {
    if (tramosConEquivalente.length === 0) {
        return mostrarMensaje('No hay tramos con accesorios guardados para copiar.', 'info');
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'modal-seleccion-tramo';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <span class="close-modal" onclick="document.getElementById('modal-seleccion-tramo').remove();">&times;</span>
            <h3>Seleccione el tramo a copiar</h3>
            <div style="max-height: 300px; overflow-y: auto;">
                <ul id="lista-tramos-copiar" style="list-style: none; padding: 0; margin: 0;">
                    ${tramosConEquivalente.map((t, i) => `
                        <li style="padding:10px;border-bottom:1px solid #eee;cursor:pointer;"
                            onclick="copiarAccesoriosDeTramo(${i})">
                            <strong>${t.nombreTramo}</strong> (${t.diametro})
                            <div style="font-size:.9em;color:#666;">
                                ${t.accesorios.length} accesorios - Total: ${t.totalEquivalenteMM.toFixed(2)} mm
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.classList.add('is-active');
}

function copiarAccesoriosDeTramo(indexTramo) {
    const origen = tramosConEquivalente[indexTramo];
    if (!origen) return;
    mostrarConfirmacion(`¿Copiar ${origen.accesorios.length} accesorios de "${origen.nombreTramo}" a este tramo?`, () => {
        accesoriosAcumulados = origen.accesorios.map(a => ({ ...a, id: Date.now() + Math.floor(Math.random()*1000) }));
        totalEquivalente = origen.totalEquivalenteMM;
        actualizarListaAccesorios();
        const modal = byId('modal-seleccion-tramo');
        modal?.remove();
        mostrarMensaje('Accesorios copiados exitosamente.', 'success');
    });
}

function getResultadosEquivalente() {
    return tramosConEquivalente.map(tramo => {
        const longitudEquivalenteM = tramo.totalEquivalenteMM / 1000;
        const longitudTotal = tramo.longitudReal + longitudEquivalenteM;
        const longitudTabla = encontrarValorSuperior(longitudTotal, 'longitud');
        const diEq = encontrarDiametro(tramo.caudalCalculo, longitudTabla);

        return {
            // base
            nombreTramo: tramo.nombreTramo,
            longitudReal: tramo.longitudReal,
            consumoTotal: tramo.consumoTotal,
            caudalCalculo: tramo.caudalCalculo,
            diametro: tramo.diametro,

            // equivalentes
            accesorios: tramo.accesorios.map(a => ({ ...a })),
            longitudEquivalenteMM: tramo.totalEquivalenteMM,
            longitudEquivalenteM,
            longitudTotal,
            longitudTablaEquivalente: longitudTabla,
            diametroEquivalente: diEq.columna,
            valorCaudalEquivalente: diEq.valor
        };
    });
}

function calcularYMostrarEquivalente() {
    const resultados = getResultadosEquivalente();
    const container = byId('resultados-equivalente');

    container.innerHTML = `
        <h3>Resumen de Diámetros Equivalentes</h3>
        <table>
            <thead>
                <tr>
                    <th>Tramo</th>
                    <th>Long. Real</th>
                    <th>Equiv. (mm)</th>
                    <th>Equiv. (m)</th>
                    <th>Long. Total</th>
                    <th>Long. Tabla</th>
                    <th>Consumo</th>
                    <th>Caudal Calc.</th>
                    <th>Caudal Tabla</th>
                    <th>Diámetro</th>
                </tr>
            </thead>
            <tbody>
                ${resultados.map(t => `
                    <tr>
                        <td>${t.nombreTramo}</td>
                        <td>${t.longitudReal} m</td>
                        <td>${t.longitudEquivalenteMM.toFixed(2)} mm</td>
                        <td>${t.longitudEquivalenteM.toFixed(2)} m</td>
                        <td>${t.longitudTotal.toFixed(2)} m</td>
                        <td>${t.longitudTablaEquivalente} m</td>
                        <td>${t.consumoTotal} Kcal/h</td>
                        <td>${t.caudalCalculo.toFixed(2)}</td>
                        <td>${t.valorCaudalEquivalente}</td>
                        <td class="diametro">${t.diametroEquivalente}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <h4 style="margin-top: 24px;">Detalle de Accesorios por Tramo</h4>
        ${resultados.map(t => `
            <div class="tramo-accesorios">
                <h5>Tramo: ${t.nombreTramo}</h5>
                <ul class="lista-detallada-accesorios">
                    ${t.accesorios.map(a => `
                        <li>${a.nombre} (${a.valorBase} × ${a.diametroUsado}mm): <strong>${a.valor} mm</strong></li>
                    `).join('')}
                </ul>
                <p><strong>Total equivalente para este tramo: ${t.longitudEquivalenteMM.toFixed(2)} mm (${t.longitudEquivalenteM.toFixed(2)} m)</strong></p>
            </div>
        `).join('')}

        <div class="button-group" style="margin-top: 20px;">
            <button class="btn secondary" style="background-color:#2ecc71;color:#fff;" id="generar-pdf-equivalente-btn">Descargar PDF</button>
            <button class="btn secondary" style="background-color:#3498db;color:#fff;" id="descargar-csv-equivalente-btn">Descargar CSV</button>
            <button class="btn primary"   style="background-color:#f39c12;color:#fff;" id="copiar-equivalente-btn">Copiar al Portapapeles</button>
            <button class="btn cancel"    style="background-color:#e74c3c;color:#fff;" id="nuevo-calculo-equivalente-btn">Nuevo Cálculo</button>
        </div>
    `;

    // Eventos de la botonera
    byId('generar-pdf-equivalente-btn').addEventListener('click', () => {
        mostrarConfirmacion('¿Generar reporte PDF sólo de equivalentes?', generarPDFEquivalente);
    });
    byId('descargar-csv-equivalente-btn').addEventListener('click', descargarDatos);
    byId('copiar-equivalente-btn').addEventListener('click', copiarDatos);
    byId('nuevo-calculo-equivalente-btn').addEventListener('click', () => {
        mostrarConfirmacion('¿Comenzar un nuevo cálculo?', reiniciarFormulario);
    });

    // Mostrar sección de resultados
    byId('equivalente-section').style.display = 'none';
    byId('resultado-equivalente-section').style.display = 'block';
    byId('resumen-final-section').style.display = 'block';

    // Generar el resumen final
    const resumenFinal = byId('resumen-final');
    resumenFinal.innerHTML = `
        <h3>Resumen Final</h3>
        <table>
            <thead>
                <tr>
                    <th>Tramo</th>
                    <th>Diámetro Predimensionado</th>
                    <th>Diámetro Equivalente</th>
                </tr>
            </thead>
            <tbody>
                ${resultados.map(t => `
                    <tr>
                        <td>${t.nombreTramo}</td>
                        <td>${t.diametro}</td>
                        <td>${t.diametroEquivalente}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ========================= PDF / CSV / COPIAR =========================
function generarPDFEquivalente() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont('helvetica');
    doc.setFontSize(12);

    try {
        const imgData = 'img/logo_gas_color.png';
        doc.addImage(imgData, 'PNG', 160, 10, 35, 15);
    } catch (e) {
        console.log('Logo no encontrado, continuando sin él');
    }

    doc.setFontSize(16);
    doc.setTextColor(46, 204, 113);
    doc.text('Informe de Diámetros Equivalentes', 15, 20);

    const resultados = getResultadosEquivalente();

    doc.autoTable({
        startY: 30,
        head: [['Tramo','Long. Real','Equiv. (mm)','Equiv. (m)','Long. Total','Long. Tabla','Consumo','Caudal Calc.','Caudal Tabla','Diámetro']],
        body: resultados.map(t => [
            t.nombreTramo,
            `${t.longitudReal} m`,
            t.longitudEquivalenteMM.toFixed(2),
            t.longitudEquivalenteM.toFixed(2),
            t.longitudTotal.toFixed(2) + ' m',
            `${t.longitudTablaEquivalente} m`,
            `${t.consumoTotal} Kcal/h`,
            t.caudalCalculo.toFixed(2),
            t.valorCaudalEquivalente,
            t.diametroEquivalente
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [46, 204, 113], textColor: 255 }
    });

    // Detalle de accesorios por tramo
    const lastY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Detalle de Accesorios por Tramo', 15, lastY);

    tramosConEquivalente.forEach((tramo, index) => {
        const startY = (index === 0) ? lastY + 8 : doc.lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.setTextColor(52, 152, 219);
        doc.text(`Tramo: ${tramo.nombreTramo} (${tramo.diametro})`, 15, startY);

        doc.autoTable({
            startY: startY + 5,
            head: [['Accesorio','Factor','Diám. (mm)','Equivalente (mm)']],
            body: tramo.accesorios.map(a => [a.nombre, a.valorBase, a.diametroUsado, a.valor]),
            styles: { fontSize: 7 },
            headStyles: { fillColor: [128,128,128], textColor: 255 },
            margin: { left: 20 }
        });

        doc.setFontSize(8);
        doc.setTextColor(0);
        doc.text(`→ Total equivalente: ${tramo.totalEquivalenteMM.toFixed(2)} mm (${(tramo.totalEquivalenteMM/1000).toFixed(2)} m)`, 20, doc.lastAutoTable.finalY + 6);
    });

    // Pie
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Generado con Herramienta de Cálculo de Diámetros - ' + new Date().toLocaleString(), 15, 285);

    doc.save(`Calculo_Equivalente_${new Date().toISOString().slice(0,10)}.pdf`);
}

function generarPDFCompleto() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont('helvetica');
    doc.setFontSize(12);

    try {
        const imgData = 'img/logo_gas_color.png';
        doc.addImage(imgData, 'PNG', 160, 10, 35, 15);
    } catch (e) {
        console.log('Logo no encontrado, continuando sin él');
    }

    doc.setFontSize(16);
    doc.setTextColor(46, 204, 113);
    doc.text('Informe Completo de Cálculos', 15, 20);
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 15, 30);

    const resultados = getResultadosEquivalente();

    // Resumen de todos los tramos
    doc.autoTable({
        startY: 40,
        head: [['Tramo','Long. Real','Equiv. (mm)','Equiv. (m)','Long. Total','Long. Tabla','Consumo','Caudal Calc.','Caudal Tabla','Diámetro']],
        body: resultados.map(t => [
            t.nombreTramo,
            `${t.longitudReal} m`,
            t.longitudEquivalenteMM.toFixed(2),
            t.longitudEquivalenteM.toFixed(2),
            t.longitudTotal.toFixed(2) + ' m',
            `${t.longitudTablaEquivalente} m`,
            `${t.consumoTotal} Kcal/h`,
            t.caudalCalculo.toFixed(2),
            t.valorCaudalEquivalente,
            t.diametroEquivalente
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [46, 204, 113], textColor: 255 }
    });

    // Detalle de accesorios por tramo
    const lastY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Detalle de Accesorios por Tramo', 15, lastY);

    tramosConEquivalente.forEach((tramo, index) => {
        const startY = (index === 0) ? lastY + 8 : doc.lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.setTextColor(52, 152, 219);
        doc.text(`Tramo: ${tramo.nombreTramo} (${tramo.diametro})`, 15, startY);

        doc.autoTable({
            startY: startY + 5,
            head: [['Accesorio','Factor','Diám. (mm)','Equivalente (mm)']],
            body: tramo.accesorios.map(a => [a.nombre, a.valorBase, a.diametroUsado, a.valor]),
            styles: { fontSize: 7 },
            headStyles: { fillColor: [128,128,128], textColor: 255 },
            margin: { left: 20 }
        });

        doc.setFontSize(8);
        doc.setTextColor(0);
        doc.text(`→ Total equivalente: ${tramo.totalEquivalenteMM.toFixed(2)} mm (${(tramo.totalEquivalenteMM/1000).toFixed(2)} m)`, 20, doc.lastAutoTable.finalY + 6);
    });

    // Pie
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Generado con Herramienta de Cálculo de Diámetros - ' + new Date().toLocaleString(), 15, 285);

    doc.save(`Calculo_Completo_${new Date().toISOString().slice(0,10)}.pdf`);
}

function descargarDatos() {
    if (tramosConEquivalente.length === 0) {
        return mostrarMensaje('No hay datos para descargar en CSV.', 'info');
    }
    const resultados = getResultadosEquivalente();
    let csv = 'Nombre,Longitud Real,Long. Equiv. (mm),Long. Equiv. (m),Long. Total,Long. Tabla,Consumo,Caudal Cálculo,Caudal Tabla,Diámetro\n';
    csv += resultados.map(t =>
        `"${t.nombreTramo}",${t.longitudReal},${t.longitudEquivalenteMM.toFixed(2)},${t.longitudEquivalenteM.toFixed(2)},${t.longitudTotal.toFixed(2)},${t.longitudTablaEquivalente},${t.consumoTotal},${t.caudalCalculo.toFixed(2)},${t.valorCaudalEquivalente},${t.diametroEquivalente}`
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `equivalentes_${Date.now()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
}

async function copiarDatos() {
    if (tramosConEquivalente.length === 0) {
        return mostrarMensaje('No hay datos para copiar.', 'info');
    }
    const resultados = getResultadosEquivalente();
    const texto = [
        'Resumen de Diámetros Equivalentes',
        'Tramo | Long.Real | Equiv(mm) | Equiv(m) | Long.Total | Long.Tabla | Consumo | CaudalCalc | CaudalTabla | Diámetro',
        ...resultados.map(t => `${t.nombreTramo} | ${t.longitudReal} | ${t.longitudEquivalenteMM.toFixed(2)} | ${t.longitudEquivalenteM.toFixed(2)} | ${t.longitudTotal.toFixed(2)} | ${t.longitudTablaEquivalente} | ${t.consumoTotal} | ${t.caudalCalculo.toFixed(2)} | ${t.valorCaudalEquivalente} | ${t.diametroEquivalente}`)
    ].join('\n');

    try {
        await navigator.clipboard.writeText(texto);
        mostrarMensaje('Datos copiados al portapapeles.', 'success');
    } catch {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = texto;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        mostrarMensaje('Datos copiados al portapapeles (fallback).', 'success');
    }
}

// ========================= RESET =========================
function reiniciarFormulario() {
    byId('tramo-nombre').value = '';
    byId('tramo-longitud').value = '';
    byId('tramo-consumo').value = '';
    byId('lista-consumos').innerHTML = '';
    byId('total-consumo').textContent = '0';
    byId('lista-tramos').innerHTML = '';
    byId('formulario-tramo-section').style.display = 'block';
    byId('lista-tramos-section').style.display = 'none';
    byId('resumen-final-section').style.display = 'none';
    byId('equivalente-section').style.display = 'none';
    byId('resultado-equivalente-section').style.display = 'none';

    consumosAcumulados = [];
    totalConsumo = 0;
    todosLosRegistros = [];
    indiceTramoActual = 0;
    accesoriosAcumulados = [];
    totalEquivalente = 0;
    tramosConEquivalente = [];

    mostrarMensaje('Formulario reiniciado. Podés comenzar un nuevo cálculo.', 'info');
}
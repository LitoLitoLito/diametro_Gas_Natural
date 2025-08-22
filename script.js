// Variables globales
let tablaDatos = [];
let consumosAcumulados = [];
let totalConsumo = 0;
let todosLosRegistros = [];
let indiceTramoActual = 0;
let accesoriosAcumulados = [];
let totalEquivalente = 0;
let tramosConEquivalente = [];
let accesorioSeleccionado = null;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Ocultar secciones inicialmente
    document.getElementById('lista-tramos-section').style.display = 'none';
    document.getElementById('resumen-final-section').style.display = 'none';
    document.getElementById('consumos-agregados').style.display = 'none';
    document.getElementById('cargando-datos').style.display = 'block';
    document.getElementById('equivalente-section').style.display = 'none';
    document.getElementById('resultado-equivalente-section').style.display = 'none';

    // Cargar datos y configurar eventos
    cargarDatosTabla().finally(() => {
        document.getElementById('cargando-datos').style.display = 'none';
        configurarEventos();
        configurarEventosModal();
    });
});

// =================== MODAL PRINCIPAL (Diámetro Accesorios) =================== //
function configurarEventosModal() {
    const closeBtn = document.querySelector('#modal-diametro .close-modal');
    if (closeBtn) closeBtn.addEventListener('click', cerrarModal);
    const confirmar = document.getElementById('confirmar-diametro-btn');
    if (confirmar) confirmar.addEventListener('click', confirmarAccesorio);
}

function abrirModal() {
    document.getElementById('nombre-accesorio-modal').textContent = accesorioSeleccionado.nombre;
    document.getElementById('diametro-accesorio').value = '';

    // Mostrar sugerencia de diámetro del tramo actual
    const anteriorSugerencia = document.querySelector('.diametro-sugerido');
    if (anteriorSugerencia) anteriorSugerencia.remove();

    const tramoActual = todosLosRegistros[indiceTramoActual];
    if (tramoActual && tramoActual.diametroNumerico) {
        const sug = document.createElement('p');
        sug.className = 'diametro-sugerido';
        sug.textContent = `Diámetro sugerido para este tramo: ${tramoActual.diametro}`;
        document.querySelector('#modal-diametro .modal-content').appendChild(sug);
    }

    document.getElementById('modal-diametro').classList.add('is-active');
}

function cerrarModal() {
    document.getElementById('modal-diametro').classList.remove('is-active');
}

// =============== CARGA DE DATOS TABLA JSON =============== //
async function cargarDatosTabla() {
    try {
        const response = await fetch('./data/convertcsv.json');
        if (!response.ok) throw new Error(`Error al cargar datos: ${response.status}`);
        const datosCrudos = await response.json();
        tablaDatos = transformarDatos(datosCrudos);
        console.log('Datos de tabla cargados:', tablaDatos);
    } catch (error) {
        console.error('Error al cargar JSON:', error);
        mostrarMensaje('Error al cargar los datos de la tabla. Por favor, recargue la página.', 'error');
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

// =============== EVENTOS GENERALES DEL FORMULARIO PRINCIPAL =============== //
function configurarEventos() {
    // Evento para agregar consumo
    document.getElementById('agregar-consumo-btn').addEventListener('click', function() {
        const inputConsumo = document.getElementById('tramo-consumo');
        const consumo = parseFloat(inputConsumo.value);
        if (!isNaN(consumo)) {
            if (consumo > 0) {
                consumosAcumulados.push(consumo);
                totalConsumo += consumo;
                actualizarListaConsumos();
                inputConsumo.value = '';
            } else {
                mostrarMensaje('El consumo debe ser mayor que 0', 'warning');
            }
        } else {
            mostrarMensaje('Ingrese un valor numérico válido para el consumo', 'warning');
        }
    });

    // Evento para agregar tramo
    document.getElementById('agregar-tramo-btn').addEventListener('click', function() {
        if (tablaDatos.length === 0) {
            mostrarMensaje('Los datos de la tabla aún no se han cargado. Por favor, espere.', 'info');
            return;
        }

        const nombreTramo = document.getElementById('tramo-nombre').value.trim() || 'Sin nombre';
        const longitudReal = parseFloat(document.getElementById('tramo-longitud').value) || 0;

        if (longitudReal <= 0) {
            mostrarMensaje('Debe ingresar una longitud válida para el tramo', 'warning');
            return;
        }

        let consumoTotal;
        if (consumosAcumulados.length > 0) {
            consumoTotal = totalConsumo;
        } else {
            const consumoInput = parseFloat(document.getElementById('tramo-consumo').value) || 0;
            if (consumoInput > 0) {
                consumoTotal = consumoInput;
            } else {
                mostrarMensaje('Debe ingresar al menos un consumo válido para el tramo', 'warning');
                return;
            }
        }

        // Calcular diámetro predimensionado
        const resultados = calcularDiametroPredimensionado(nombreTramo, longitudReal, consumoTotal);
        todosLosRegistros.push(resultados);
        
        // Actualizar lista de tramos
        actualizarListaTramos();
        
        // Limpiar el formulario
        document.getElementById('tramo-nombre').value = '';
        document.getElementById('tramo-longitud').value = '';
        document.getElementById('tramo-consumo').value = '';
        consumosAcumulados = [];
        totalConsumo = 0;
        document.getElementById('lista-consumos').innerHTML = '';
        document.getElementById('total-consumo').textContent = '0';
        document.getElementById('consumos-agregados').style.display = 'none';
        
        mostrarMensaje('Tramo agregado correctamente', 'success');
    });

    // Evento para finalizar ingreso de tramos
    document.getElementById('finalizar-tramos-btn').addEventListener('click', function() {
        if (todosLosRegistros.length === 0) {
            mostrarMensaje('Debe agregar al menos un tramo antes de continuar', 'warning');
            return;
        }
        
        document.getElementById('formulario-tramo-section').style.display = 'none';
        document.getElementById('lista-tramos-section').style.display = 'block';
        
        // Iniciar cálculo de equivalente
        iniciarCalculoEquivalente();
    });

    // Evento para cancelar
    document.getElementById('cancelar-btn').addEventListener('click', function() {
        mostrarConfirmacion('¿Está seguro de cancelar? Se perderán todos los datos ingresados.', reiniciarFormulario);
    });

    // Evento para cancelar el cálculo equivalente
    document.getElementById('cancelar-equivalente-btn').addEventListener('click', function() {
        mostrarConfirmacion('¿Está seguro de cancelar? Se perderán todos los datos ingresados.', reiniciarFormulario);
    });

    // Evento para descargar datos CSV
    document.getElementById('descargar-btn').addEventListener('click', descargarDatos);

    // Evento para copiar datos al portapapeles
    document.getElementById('copiar-btn').addEventListener('click', copiarDatos);

    // Evento para nuevo cálculo
    document.getElementById('nuevo-calculo-btn').addEventListener('click', function() {
        mostrarConfirmacion('¿Desea comenzar un nuevo cálculo? Se perderán los datos actuales.', reiniciarFormulario);
    });
}

// =============== CÁLCULOS PRINCIPALES =============== //
function calcularDiametroPredimensionado(nombreTramo, longitudReal, consumoTotal) {
    const caudalCalculo = (consumoTotal / 9300) * 1000; // Caudal en m³/h
    const diametro = encontrarDiametro(caudalCalculo, longitudReal);
    
    // Asegura que el diámetro numérico sea válido
    const diametroNumerico = parseFloat(diametro.columna.split(' ')[0].replace(',', '.'));
    
    return {
        nombreTramo,
        longitudReal,
        consumoTotal,
        caudalCalculo,
        diametro: diametro.columna,
        diametroNumerico: isNaN(diametroNumerico) ? 0 : diametroNumerico,
        valorCaudal: diametro.valor,
        fecha: new Date().toLocaleString()
    };
}

function encontrarValorSuperior(valor, columna) {
    const valores = tablaDatos.map(item => item[columna]).sort((a, b) => a - b);
    return valores.find(v => v >= valor) || valores[valores.length - 1];
}

function encontrarDiametro(caudal, longitudTabla, tolerancia = 0.0001) {
    // Busca la fila que corresponde a la longitud de tabla o la más cercana superior
    const fila = tablaDatos.find(f => parseFloat(f.longitud) >= longitudTabla) || tablaDatos[tablaDatos.length - 1];
    let columnaEncontrada = null;
    let valorEncontrado = null;

    // Itera sobre las columnas para encontrar el diámetro adecuado
    for (const [columna, valor] of Object.entries(fila)) {
        if (columna === 'longitud') continue;
        const valorNum = parseFloat(valor);
        if (valorNum >= caudal) {
            columnaEncontrada = columna;
            valorEncontrado = valorNum;
            break;
        }
    }

    // Si no se encuentra un valor directamente superior, busca por tolerancia
    if (!columnaEncontrada) {
        for (const [columna, valor] of Object.entries(fila)) {
            if (columna === 'longitud') continue;
            const valorNum = parseFloat(valor);
            if (Math.abs(valorNum - caudal) / caudal <= tolerancia) {
                columnaEncontrada = columna;
                valorEncontrado = valorNum;
                break;
            }
        }
    }

    // Si aún no se encuentra, toma el diámetro más grande disponible
    if (!columnaEncontrada) {
        const cols = Object.entries(fila).filter(([c]) => c !== 'longitud');
        const ultima = cols[cols.length - 1];
        columnaEncontrada = ultima[0];
        valorEncontrado = parseFloat(ultima[1]);
    }

    return { columna: columnaEncontrada, valor: valorEncontrado };
}

// =============== UI: LISTAS Y RESULTADOS =============== //
function actualizarListaConsumos() {
    const lista = document.getElementById('lista-consumos');
    lista.innerHTML = consumosAcumulados.map((consumo, i) => `<li>Consumo ${i + 1}: ${consumo} Kcal/h</li>`).join('');
    document.getElementById('total-consumo').textContent = totalConsumo;
    document.getElementById('consumos-agregados').style.display = 'block';
}

function actualizarListaTramos() {
    const lista = document.getElementById('lista-tramos');
    lista.innerHTML = `
        <h3>Tramos ingresados (${todosLosRegistros.length})</h3>
        <table>
            <thead>
                <tr>
                    <th>Tramo</th>
                    <th>Longitud (m)</th>
                    <th>Consumo (Kcal/h)</th>
                    <th>Diámetro Predimensionado</th>
                </tr>
            </thead>
            <tbody>
                ${todosLosRegistros.map((tramo, index) => `
                    <tr>
                        <td>${tramo.nombreTramo}</td>
                        <td>${tramo.longitudReal}</td>
                        <td>${tramo.consumoTotal}</td>
                        <td>${tramo.diametro}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// =============== DIÁMETROS EQUIVALENTES FUNCTIONS =============== //
function iniciarCalculoEquivalente() {
    indiceTramoActual = 0;
    document.getElementById('lista-tramos-section').style.display = 'none';
    document.getElementById('equivalente-section').style.display = 'block';
    mostrarTramoActual();
    configurarEventosAccesorios();
}

function mostrarTramoActual() {
    const tramo = todosLosRegistros[indiceTramoActual];
    document.getElementById('nombre-tramo-actual').textContent = tramo.nombreTramo;
    document.getElementById('diametro-predimensionado').textContent = tramo.diametro;
    accesoriosAcumulados = [];
    totalEquivalente = 0;
    actualizarListaAccesorios();

    // Actualizar botones de navegación
    const siguienteBtn = document.getElementById('siguiente-tramo-btn');
    const calcularBtn = document.getElementById('calcular-equivalente-btn');
    
    if (indiceTramoActual < todosLosRegistros.length - 1) {
        siguienteBtn.style.display = 'inline-block';
        calcularBtn.style.display = 'none';
        siguienteBtn.textContent = `Siguiente Tramo (${indiceTramoActual + 1}/${todosLosRegistros.length})`;
    } else {
        siguienteBtn.style.display = 'none';
        calcularBtn.style.display = 'inline-block';
    }

    // Logic to show/hide "Copiar accesorios" button
    const botonera = document.getElementById('botonera-equivalente');
    let copiarBtn = document.getElementById('copiar-accesorios-btn');

    if (tramosConEquivalente.length > 0) {
        // Si hay tramos para copiar Y el botón no existe, crearlo
        if (!copiarBtn) {
            copiarBtn = document.createElement('button');
            copiarBtn.id = 'copiar-accesorios-btn';
            copiarBtn.className = 'btn secondary';
            copiarBtn.textContent = 'Copiar accesorios de otro tramo';
            copiarBtn.addEventListener('click', mostrarModalSeleccionTramo);
            botonera.insertBefore(copiarBtn, botonera.firstChild);
        } else {
            // Si el botón ya existe y hay tramos para copiar, asegurarse de que esté visible
            copiarBtn.style.display = 'inline-block';
        }
    } else {
        // Si no hay tramos para copiar, ocultar el botón si existe
        if (copiarBtn) {
            copiarBtn.style.display = 'none';
        }
    }
}

function configurarEventosAccesorios() {
    // Evitar duplicar listeners al re-entrar a la sección de accesorios
    document.querySelectorAll('.accesorio-btn').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
    });
    
    // Añadir listeners a los nuevos (o reemplazados) botones
    document.querySelectorAll('.accesorio-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            accesorioSeleccionado = { 
                nombre: this.dataset.nombre, 
                valor: parseFloat(this.dataset.valor),
                id: Date.now() + Math.floor(Math.random() * 1000)
            };
            abrirModal();
        });
    });

    const sig = document.getElementById('siguiente-tramo-btn');
    if (sig) sig.onclick = function() {
        guardarTramoEquivalente();
        indiceTramoActual++;
        mostrarTramoActual();
    };

    const calc = document.getElementById('calcular-equivalente-btn');
    if (calc) calc.onclick = function() {
        guardarTramoEquivalente();
        calcularYMostrarEquivalente();
    };
}

function confirmarAccesorio() {
    const diametro = parseFloat(document.getElementById('diametro-accesorio').value);
    if (isNaN(diametro) || diametro <= 0) {
        mostrarMensaje('Ingrese un diámetro válido (mayor que 0)', 'warning');
        return;
    }
    if (diametro > 100) {
        mostrarConfirmacion(`¿Está seguro que el diámetro es ${diametro}mm? Los valores típicos son entre 6-50mm.`, () => {
            procesarConfirmacionAccesorio(diametro);
        });
    } else {
        procesarConfirmacionAccesorio(diametro);
    }
}

function procesarConfirmacionAccesorio(diametro) {
    const equivalente = accesorioSeleccionado.valor * diametro;
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
    const lista = document.getElementById('lista-accesorios');
    lista.innerHTML = accesoriosAcumulados.map(a => `
        <li>
            ${a.nombre} (${a.valorBase} × ${a.diametroUsado}mm): <strong>${a.valor} mm</strong>
            <button class="btn-eliminar-accesorio" data-id="${a.id}" title="Eliminar accesorio">×</button>
        </li>
    `).join('');
    
    document.getElementById('total-equivalente').textContent = totalEquivalente.toFixed(2);
    
    document.querySelectorAll('.btn-eliminar-accesorio').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            eliminarAccesorio(id);
        });
    });
}

function eliminarAccesorio(id) {
    const index = accesoriosAcumulados.findIndex(a => a.id === id);
    if (index !== -1) {
        totalEquivalente -= parseFloat(accesoriosAcumulados[index].valor);
        accesoriosAcumulados.splice(index, 1);
        actualizarListaAccesorios();
        mostrarMensaje('Accesorio eliminado.', 'success');
    }
}

function guardarTramoEquivalente() {
    const tramoOriginal = todosLosRegistros[indiceTramoActual];
    // Almacena una copia de los accesorios acumulados y el total equivalente
    tramosConEquivalente.push({
        ...tramoOriginal,
        accesorios: [...accesoriosAcumulados],
        totalEquivalenteMM: totalEquivalente,
        totalEquivalenteM: totalEquivalente / 1000
    });
}

function mostrarModalSeleccionTramo() {
    if (tramosConEquivalente.length === 0) {
        mostrarMensaje('No hay tramos con accesorios guardados para copiar.', 'info');
        return;
    }
    
    // Crear modal de selección
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'modal-seleccion-tramo';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <span class="close-modal" onclick="document.getElementById('modal-seleccion-tramo').remove();">&times;</span>
            <h3>Seleccione el tramo a copiar</h3>
            <div style="max-height: 300px; overflow-y: auto;">
                <ul id="lista-tramos-copiar" style="list-style: none; padding: 0;">
                    ${tramosConEquivalente.map((tramo, index) => `
                        <li style="padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;" 
                            onclick="copiarAccesoriosDeTramo(${index})">
                            <strong>${tramo.nombreTramo}</strong> (${tramo.diametro})
                            <div style="font-size: 0.9em; color: #666;">
                                ${tramo.accesorios.length} accesorios - Total: ${tramo.totalEquivalenteMM.toFixed(2)} mm
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
    const tramoSeleccionado = tramosConEquivalente[indexTramo];
    if (!tramoSeleccionado) return;
    
    mostrarConfirmacion(`¿Desea copiar los ${tramoSeleccionado.accesorios.length} accesorios de "${tramoSeleccionado.nombreTramo}" a este tramo?`, () => {
        // Copiar accesorios con nuevos IDs para evitar conflictos
        accesoriosAcumulados = tramoSeleccionado.accesorios.map(a => ({
            ...a,
            id: Date.now() + Math.floor(Math.random() * 1000)
        }));
        
        totalEquivalente = tramoSeleccionado.totalEquivalenteMM;
        actualizarListaAccesorios();
        
        // Cerrar y eliminar modal de selección de tramo
        const modal = document.getElementById('modal-seleccion-tramo');
        if (modal) modal.remove();
        mostrarMensaje('Accesorios copiados exitosamente.', 'success');
    });
}

function getResultadosEquivalente() {
    return tramosConEquivalente.map(tramo => {
        const longitudTotal = tramo.longitudReal + (tramo.totalEquivalenteMM / 1000);
        const longitudTabla = encontrarValorSuperior(longitudTotal, 'longitud');
        const caudal = tramo.caudalCalculo;
        const diametroEquivalente = encontrarDiametro(caudal, longitudTabla);
        
        return {
            ...tramo,
            longitudEquivalenteMM: tramo.totalEquivalenteMM,
            longitudEquivalenteM: tramo.totalEquivalenteMM / 1000,
            longitudTotal,
            longitudTablaEquivalente: longitudTabla,
            diametroEquivalente: diametroEquivalente.columna,
            valorCaudalEquivalente: diametroEquivalente.valor
        };
    });
}

// ... resto del script sin cambios previos

function calcularYMostrarEquivalente() {
    const resultadosEquivalente = getResultadosEquivalente();

    const container = document.getElementById('resultados-equivalente');
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
                ${resultadosEquivalente.map(t => `
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
        
        <h4 style="margin-top: 30px;">Detalle de Accesorios por Tramo</h4>
        ${resultadosEquivalente.map(t => `
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
            <button class="btn secondary" style="background-color: #2ecc71; color: white;" id="generar-pdf-equivalente-btn">Descargar PDF</button>
            <button class="btn secondary" style="background-color: #3498db; color: white;" id="descargar-csv-btn">Descargar CSV</button>
            <button class="btn primary" style="background-color: #f39c12; color: white;" id="copiar-equivalente-btn">Copiar al Portapapeles</button>
            <button class="btn cancel" style="background-color: #e74c3c; color: white;" id="nuevo-calculo-equivalente-btn">Nuevo Cálculo</button>
        </div>
    `;

    // Evento para descargar PDF de solo equivalentes
    document.getElementById('generar-pdf-equivalente-btn').addEventListener('click', () => {
        mostrarConfirmacion('¿Desea generar un reporte en PDF de solo los cálculos de equivalentes?', generarPDFEquivalente);
    });

    // Nuevo: eventos para CSV, Copiar y Nuevo Cálculo
    document.getElementById('descargar-csv-btn').addEventListener('click', descargarDatos);
    document.getElementById('copiar-equivalente-btn').addEventListener('click', copiarDatos);
    document.getElementById('nuevo-calculo-equivalente-btn').addEventListener('click', () => {
        mostrarConfirmacion('¿Desea comenzar un nuevo cálculo? Se borrarán todos los datos anteriores.', reiniciarFormulario);
    });

    // Ocultar secciones anteriores
    document.getElementById('equivalente-section').style.display = 'none';
    document.getElementById('resultado-equivalente-section').style.display = 'block';
}


function mostrarResumen() {
    const container = document.getElementById('resumen-final');

    if (tramosConEquivalente.length === 0) {
        container.innerHTML = '<p class="empty-message">No hay datos registrados</p>';
    } else {
        const resultadosEquivalente = getResultadosEquivalente();
        
        container.innerHTML = `
            <h3>Resumen Final de Cálculos</h3>
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
                    ${resultadosEquivalente.map(t => `
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
        `;
    }

    document.getElementById('resumen-final-section').style.display = 'block';
    document.getElementById('resultado-equivalente-section').style.display = 'none';
}

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

    const resultadosEq = getResultadosEquivalente();

    doc.autoTable({
        startY: 30,
        head: [['Tramo', 'Long. Real', 'Equiv. (mm)', 'Equiv. (m)', 'Long. Total', 'Long. Tabla', 'Consumo', 'Caudal Calc.', 'Caudal Tabla', 'Diámetro']],
        body: resultadosEq.map(t => [
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
    const lastY2 = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text('Detalle de Accesorios por Tramo', 15, lastY2);

    tramosConEquivalente.forEach((tramo, index) => {
        const startY = (index === 0) ? lastY2 + 10 : doc.lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.setTextColor(52, 152, 219);
        doc.text(`Tramo: ${tramo.nombreTramo} (${tramo.diametro})`, 15, startY);

        doc.autoTable({
            startY: startY + 5,
            head: [['Accesorio', 'Factor', 'Diámetro (mm)', 'Equivalente (mm)']],
            body: tramo.accesorios.map(a => [a.nombre, a.valorBase, a.diametroUsado, a.valor]),
            styles: { fontSize: 7 },
            headStyles: { fillColor: [128, 128, 128], textColor: 255 },
            margin: { left: 20 }
        });

        doc.setFontSize(8);
        doc.setTextColor(0);
        doc.text(`→ Total equivalente: ${tramo.totalEquivalenteMM.toFixed(2)} mm (${(tramo.totalEquivalenteMM/1000).toFixed(2)} m)`, 20, doc.lastAutoTable.finalY + 8);
    });

    // Pie
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Generado con Herramienta de Cálculo de Diámetros - ' + new Date().toLocaleString(), 15, 285);

    doc.save(`Calculo_Equivalente_${new Date().toISOString().slice(0,10)}.pdf`);
}
// =============== UTILIDADES VARIAS =============== //
function reiniciarFormulario() {
    document.getElementById('tramo-nombre').value = '';
    document.getElementById('tramo-longitud').value = '';
    document.getElementById('tramo-consumo').value = '';
    document.getElementById('lista-consumos').innerHTML = '';
    document.getElementById('total-consumo').textContent = '0';
    document.getElementById('lista-tramos').innerHTML = '';
    document.getElementById('formulario-tramo-section').style.display = 'block';
    document.getElementById('lista-tramos-section').style.display = 'none';
    document.getElementById('resumen-final-section').style.display = 'none';
    document.getElementById('equivalente-section').style.display = 'none';
    document.getElementById('resultado-equivalente-section').style.display = 'none';
    consumosAcumulados = [];
    totalConsumo = 0;
    todosLosRegistros = [];
    indiceTramoActual = 0;
    accesoriosAcumulados = [];
    totalEquivalente = 0;
    tramosConEquivalente = [];
    
    // Ocultar el botón de copiar si no hay tramos
    const copiarBtn = document.getElementById('copiar-accesorios-btn');
    if (copiarBtn) copiarBtn.style.display = 'none';
    
    mostrarMensaje('Formulario reiniciado. Puede comenzar un nuevo cálculo.', 'info');
}

function descargarDatos() {
    if (tramosConEquivalente.length === 0) {
        mostrarMensaje('No hay datos para descargar en formato CSV.', 'info');
        return;
    }

    const resultadosEquivalente = getResultadosEquivalente();
    
    let csv = 'Nombre,Longitud Real,Longitud Equivalente (mm),Longitud Equivalente (m),Longitud Total,Longitud Tabla,Consumo,Caudal Cálculo,Caudal Tabla,Diámetro,Fecha\n';
    resultadosEquivalente.forEach(reg => {
        csv += `"${reg.nombreTramo}",${reg.longitudReal},${reg.longitudEquivalenteMM.toFixed(2)},${reg.longitudEquivalenteM.toFixed(2)},${reg.longitudTotal.toFixed(2)},${reg.longitudTablaEquivalente},${reg.consumoTotal},${reg.caudalCalculo.toFixed(2)},${reg.valorCaudalEquivalente},"${reg.diametroEquivalente}","${reg.fecha}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calculos_equivalentes_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    mostrarMensaje('Datos descargados en CSV.', 'success');
}

function copiarDatos() {
    if (tramosConEquivalente.length === 0) {
        mostrarMensaje('No hay datos para copiar al portapapeles.', 'info');
        return;
    }

    const resultadosEquivalente = getResultadosEquivalente();
    
    const texto = resultadosEquivalente.map(reg => 
        `Tramo: ${reg.nombreTramo}\n` +
        `Longitud Real: ${reg.longitudReal} m\n` +
        `Longitud Equivalente: ${reg.longitudEquivalenteMM.toFixed(2)} mm (${reg.longitudEquivalenteM.toFixed(2)} m)\n` +
        `Longitud Total: ${reg.longitudTotal.toFixed(2)} m\n` +
        `Longitud Tabla: ${reg.longitudTablaEquivalente} m\n` +
        `Consumo Total: ${reg.consumoTotal} Kcal/h\n` +
        `Caudal Cálculo: ${reg.caudalCalculo.toFixed(2)} m³/h\n` +
        `Caudal Tabla: ${reg.valorCaudalEquivalente}\n` +
        `Diámetro: ${reg.diametroEquivalente}\n` +
        `Fecha: ${reg.fecha}\n` +
        '------------------------'
    ).join('\n');

    navigator.clipboard.writeText(texto).then(() => {
        mostrarMensaje('Datos copiados al portapapeles.', 'success');
    }).catch(err => {
        console.error('Error al copiar:', err);
        mostrarMensaje('Error al copiar los datos al portapapeles.', 'error');
    });
}

// =============== FUNCIONES DE MENSAJES/MODALES PERSONALIZADOS =============== //
function mostrarMensaje(mensaje, tipo = 'info', duracion = 3000) {
    let mensajeBox = document.getElementById('custom-message-box');
    if (!mensajeBox) {
        mensajeBox = document.createElement('div');
        mensajeBox.id = 'custom-message-box';
        mensajeBox.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 15px 25px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 3000;
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        document.body.appendChild(mensajeBox);
    }

    mensajeBox.innerHTML = '';
    let bgColor = '';
    let icon = '';

    switch (tipo) {
        case 'success':
            bgColor = '#2ecc71';
            icon = '✔';
            break;
        case 'error':
            bgColor = '#e74c3c';
            icon = '✖';
            break;
        case 'warning':
            bgColor = '#f39c12';
            icon = '⚠';
            break;
        case 'info':
        default:
            bgColor = '#3498db';
            icon = 'ℹ';
            break;
    }

    mensajeBox.style.backgroundColor = bgColor;
    mensajeBox.innerHTML = `<span style="font-size: 1.2em;">${icon}</span> ${mensaje}`;
    mensajeBox.style.opacity = '1';

    setTimeout(() => {
        mensajeBox.style.opacity = '0';
        setTimeout(() => {
            mensajeBox.remove();
        }, 300);
    }, duracion);
}

function mostrarConfirmacion(mensaje, onConfirm) {
    const existingModal = document.getElementById('custom-confirm-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'custom-confirm-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px; text-align: center;">
            <h3>Confirmar Acción</h3>
            <p>${mensaje}</p>
            <div class="button-group" style="justify-content: center; margin-top: 20px;">
                <button class="btn primary" id="confirm-btn-yes">Sí</button>
                <button class="btn cancel" id="confirm-btn-no">No</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.classList.add('is-active');

    document.getElementById('confirm-btn-yes').onclick = () => {
        modal.classList.remove('is-active');
        onConfirm();
    };
    document.getElementById('confirm-btn-no').onclick = () => {
        modal.classList.remove('is-active');
    };
}
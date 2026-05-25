const motor = new MotorGestor();

let arbolMemoria;
let nP1, nP2, p1Nota, p2Nota;
let estadoUI = { P1: false, P2: false, Config: false, StatsColapsado: false };

document.addEventListener("DOMContentLoaded", () => {
    
    const params = new URLSearchParams(window.location.search);
    const materiaUrl = params.get("materia");
    
    let arbolGuardado = null;

    if (materiaUrl) {
        const materiaDecodificada = decodeURIComponent(materiaUrl.replace(/\+/g, ' '));
        arbolGuardado = motor.mostrarMateria(materiaDecodificada);
        if (arbolGuardado) {
            document.getElementById("materia-titulo").textContent = materiaDecodificada;
            document.getElementById("materia-visor").classList.remove("oculto");
            document.getElementById("input-nombre-materia").value = materiaDecodificada;
        }
    }

    if (arbolGuardado) {
        arbolMemoria = arbolGuardado;
    } else {
        const nodoP1Inicial = new NodoGrupo("P1", 0.5, [
            new NodoNota("f1", 0.33),
            new NodoNota("p1", 0.33),
            new NodoNota("e1", 0.34)
        ]);
        const nodoP2Inicial = new NodoGrupo("P2", 0.5, [
            new NodoNota("f2", 0.33),
            new NodoNota("p2", 0.33),
            new NodoNota("e2", 0.34)
        ]);
        arbolMemoria = new NodoGrupo("PP", 1, [nodoP1Inicial, nodoP2Inicial]);
    }

    nP1 = arbolMemoria.hijos[0] instanceof NodoGrupo ? arbolMemoria.hijos[0] : arbolMemoria.buscar("P1") || new NodoGrupo("P1", 0.5, []);
    nP2 = arbolMemoria.hijos[1] instanceof NodoGrupo ? arbolMemoria.hijos[1] : arbolMemoria.buscar("P2") || new NodoGrupo("P2", 0.5, []);
    
    p1Nota = arbolMemoria.hijos[0] instanceof NodoNota ? arbolMemoria.hijos[0] : new NodoNota("P1_M", nP1.peso, null);
    p2Nota = arbolMemoria.hijos[1] instanceof NodoNota ? arbolMemoria.hijos[1] : new NodoNota("P2_M", nP2.peso, null);

    construirInputsDetalle("P1", "p1-nodes", "Formativa", "Práctica", "Examen", nP1);
    construirInputsDetalle("P2", "p2-nodes", "Formativa", "Práctica", "Examen", nP2);

    configurarInteraccionesPrincipales("P1", "input-main-p1", "btn-expand-p1", "card-p1", nP1, p1Nota);
    configurarInteraccionesPrincipales("P2", "input-main-p2", "btn-expand-p2", "card-p2", nP2, p2Nota);

    const inputPesoP1 = document.querySelector('.peso-input[data-id="P1"]');
    const inputPesoP2 = document.querySelector('.peso-input[data-id="P2"]');
    
    inputPesoP1.value = Math.round(nP1.peso * 100);
    inputPesoP2.value = Math.round(nP2.peso * 100);
    document.getElementById("visor-peso-p1").textContent = `${Math.round(nP1.peso * 100)}%`;
    document.getElementById("visor-peso-p2").textContent = `${Math.round(nP2.peso * 100)}%`;

    inputPesoP1.addEventListener("input", (e) => {
        let p1Val = parseInt(e.target.value) || 0;
        if (p1Val >= 100) p1Val = 99; 
        
        const p2Val = 100 - p1Val;
        
        inputPesoP1.value = p1Val;
        inputPesoP2.value = p2Val;
        
        nP1.peso = p1Val / 100;
        nP2.peso = p2Val / 100;
        p1Nota.peso = p1Val / 100;
        p2Nota.peso = p2Val / 100;

        document.getElementById("visor-peso-p1").textContent = `${p1Val}%`;
        document.getElementById("visor-peso-p2").textContent = `${p2Val}%`;
        renderizarVista();
    });

    document.getElementById("btn-config").addEventListener("click", () => {
        estadoUI.Config = !estadoUI.Config;
        document.querySelectorAll(".peso-visor").forEach(el => el.classList.toggle("oculto", estadoUI.Config));
        document.querySelectorAll(".peso-input").forEach(el => el.classList.toggle("oculto", !estadoUI.Config));
    });

    document.getElementById("btn-guardar").addEventListener("click", () => {
        document.getElementById("panel-guardar").classList.toggle("oculto");
    });

    document.getElementById("btn-confirmar-guardar").addEventListener("click", () => {
        const nombre = document.getElementById("input-nombre-materia").value.trim();
        if (nombre) {
            motor.crearActualizarMateria(nombre, arbolMemoria);
            document.getElementById("panel-guardar").classList.add("oculto");
            document.getElementById("materia-titulo").textContent = nombre;
            document.getElementById("materia-visor").classList.remove("oculto");
        }
    });

    document.getElementById("meta-input").addEventListener("input", renderizarVista);

    document.getElementById("btn-colapsar-stats").addEventListener("click", () => {
        estadoUI.StatsColapsado = !estadoUI.StatsColapsado;
        renderizarVista();
    });

    renderizarVista();
});

function construirInputsDetalle(idPadre, contenedorId, labelF, labelP, labelE, nodoGrupo) {
    const contenedor = document.getElementById(contenedorId);
    const prefijo = idPadre.toLowerCase().charAt(1);
    const etiquetas = [labelF, labelP, labelE];
    const ids = [`f${prefijo}`, `p${prefijo}`, `e${prefijo}`];

    let html = "";
    ids.forEach((idNodo, index) => {
        const nodo = nodoGrupo.buscar(idNodo);
        const autoClase = index === 2 ? "peso-input--auto" : "";
        const autoReadonly = index === 2 ? "readonly title='Se calcula automáticamente'" : "";
        const pesoVisual = Math.round(nodo.peso * 100);
        html += `
            <div class="node-item">
                <div class="node-item__meta">
                    <span class="node-item__name">${etiquetas[index]}</span>
                    <span class="node-item__badge peso-visor">${pesoVisual}%</span>
                    <input type="number" class="peso-input oculto ${autoClase}" data-id="${idNodo}" value="${pesoVisual}" min="1" max="99" step="1" ${autoReadonly}>
                </div>
                <div class="node-item__input-group">
                    <input type="number" class="node-item__field calificacion-detalle" data-id="${idNodo}" placeholder="-" min="0" max="10" step="0.01" value="${nodo.nota !== null && nodo.nota !== undefined ? nodo.nota : ''}">
                </div>
            </div>
        `;
    });
    
    contenedor.innerHTML = html;

    const inputsPeso = contenedor.querySelectorAll(".peso-input");
    inputsPeso.forEach((input, i) => {
        if (i < 2) { 
            input.addEventListener("input", (e) => {
                let val1 = parseInt(inputsPeso[0].value) || 0;
                let val2 = parseInt(inputsPeso[1].value) || 0;
                
                if (val1 + val2 >= 100) {
                    if (e.target === inputsPeso[0]) {
                        val1 = 99 - val2;
                        inputsPeso[0].value = val1;
                    } else {
                        val2 = 99 - val1;
                        inputsPeso[1].value = val2;
                    }
                }
                
                const val3 = 100 - (val1 + val2);
                inputsPeso[2].value = val3;
                
                nodoGrupo.hijos[0].peso = val1 / 100;
                nodoGrupo.hijos[1].peso = val2 / 100;
                nodoGrupo.hijos[2].peso = val3 / 100;
                
                inputsPeso[0].previousElementSibling.textContent = `${val1}%`;
                inputsPeso[1].previousElementSibling.textContent = `${val2}%`;
                inputsPeso[2].previousElementSibling.textContent = `${val3}%`;
                
                renderizarVista();
            });
        }
    });

    contenedor.querySelectorAll(".calificacion-detalle").forEach(input => {
        input.addEventListener("input", (e) => {
            let val = e.target.value;
            if (val !== "") {
                if (parseFloat(val) > 10) e.target.value = 10;
                if (parseFloat(val) < 0) e.target.value = 0;
            }
            const id = e.target.getAttribute("data-id");
            const num = e.target.value === "" ? null : parseFloat(e.target.value);
            nodoGrupo.buscar(id).actualizarNota(num);
            
            const inputMainId = idPadre === "P1" ? "input-main-p1" : "input-main-p2";
            const btnExpandId = idPadre === "P1" ? "btn-expand-p1" : "btn-expand-p2";
            
            if (nodoGrupo.tieneNota()) {
                const prom = nodoGrupo.promedioActual();
                document.getElementById(inputMainId).value = prom !== null ? prom.toFixed(2) : "";
            } else {
                document.getElementById(inputMainId).value = "";
            }
            
            if (nodoGrupo.tieneNota() || nodoGrupo.notasComputadas() > 0) {
                document.getElementById(btnExpandId).classList.add("btn-expand--active");
            } else {
                document.getElementById(btnExpandId).classList.remove("btn-expand--active");
            }

            renderizarVista();
        });
    });
}

function configurarInteraccionesPrincipales(idPadre, inputId, btnId, cardId, grupoOriginal, notaManual) {
    const inputMain = document.getElementById(inputId);
    const btnExpand = document.getElementById(btnId);
    const cardDetalle = document.getElementById(cardId);
    const indice = idPadre === "P1" ? 0 : 1;

    if (arbolMemoria.hijos[indice] instanceof NodoNota && arbolMemoria.hijos[indice].tieneNota()) {
        inputMain.value = arbolMemoria.hijos[indice].nota;
    } else if (grupoOriginal.tieneNota()) {
        inputMain.value = grupoOriginal.promedioActual().toFixed(2);
        btnExpand.classList.add("btn-expand--active");
    }

    inputMain.addEventListener("input", (e) => {
        estadoUI[idPadre] = false;
        cardDetalle.classList.add("oculto");
        btnExpand.classList.remove("btn-expand--active");

        let val = e.target.value;
        if (val !== "") {
            if (parseFloat(val) > 10) e.target.value = 10;
            if (parseFloat(val) < 0) e.target.value = 0;
        }

        const num = e.target.value === "" ? null : parseFloat(e.target.value);
        notaManual.actualizarNota(num);
        arbolMemoria.hijos[indice] = notaManual;
        
        renderizarVista();
    });

    btnExpand.addEventListener("click", () => {
        estadoUI[idPadre] = !estadoUI[idPadre];
        
        if (estadoUI[idPadre]) {
            cardDetalle.classList.remove("oculto");
            arbolMemoria.hijos[indice] = grupoOriginal;
            
            if (grupoOriginal.tieneNota()) {
                inputMain.value = grupoOriginal.promedioActual().toFixed(2);
            } else {
                inputMain.value = "";
            }
            
            if (grupoOriginal.notasComputadas() > 0) {
                btnExpand.classList.add("btn-expand--active");
            }
        } else {
            cardDetalle.classList.add("oculto");
            const val = parseFloat(inputMain.value);
            notaManual.actualizarNota(isNaN(val) ? null : val);
            arbolMemoria.hijos[indice] = notaManual;
            
            if (!isNaN(val)) {
                btnExpand.classList.remove("btn-expand--active");
            }
        }
        
        renderizarVista();
    });
}

function renderizarVista() {
    const metaDeseada = parseFloat(document.getElementById("meta-input").value) || 0;
    const resumen = arbolMemoria.resumenCon(metaDeseada);
    const resumenPP = resumen["PP"];
    
    const seccionEstadisticas = document.getElementById("seccion-estadisticas");
    const footerColapsar = document.getElementById("footer-colapsar");
    const iconoColapsar = document.getElementById("btn-colapsar-stats");
    const cajaGrafica = document.getElementById("caja-grafica");
    const gridMetricas = document.getElementById("grid-metricas");
    const cajaInsight = document.getElementById("caja-insight");
    const resumenCompleto = document.getElementById("resumen-completo");
    const insight = document.getElementById("insight-text");

    const estaCompletamenteLleno = arbolMemoria.tieneNota();
    const notasComputadas = arbolMemoria.notasComputadas(true);
    const hayAlgunaNota = notasComputadas > 0;

    if (!hayAlgunaNota) {
        seccionEstadisticas.classList.add("oculto");
        footerColapsar.classList.add("oculto");
        estadoUI.StatsColapsado = false;
        return;
    }

    seccionEstadisticas.classList.remove("oculto");

    if (estaCompletamenteLleno) {
        cajaGrafica.classList.add("colapsado-suave");
        gridMetricas.classList.add("colapsado-suave");
        cajaInsight.classList.add("oculto");
        footerColapsar.classList.add("oculto");
        
        resumenCompleto.classList.remove("oculto");
        document.getElementById("promedio-final-texto").textContent = resumenPP.promedio_actual.toFixed(2);
        
        const estadoFinal = document.getElementById("estado-final-texto");
        if (resumenPP.promedio_actual >= 7) {
            estadoFinal.textContent = "Aprobada";
            estadoFinal.className = "resumen-completo__meta estado-aprobada";
        } else {
            estadoFinal.textContent = "Reprobada";
            estadoFinal.className = "resumen-completo__meta estado-reprobada";
        }
        return;
    }

    resumenCompleto.classList.add("oculto");
    footerColapsar.classList.remove("oculto");
    cajaInsight.classList.remove("oculto");

    if (estadoUI.StatsColapsado) {
        cajaGrafica.classList.add("colapsado-suave");
        gridMetricas.classList.add("colapsado-suave");
        iconoColapsar.classList.replace("fa-chevron-down", "fa-chevron-up");
    } else {
        cajaGrafica.classList.remove("colapsado-suave");
        gridMetricas.classList.remove("colapsado-suave");
        iconoColapsar.classList.replace("fa-chevron-up", "fa-chevron-down");
    }

    const promActual = resumenPP.promedio_actual || 0;
    document.getElementById("metric-actual").textContent = promActual.toFixed(2);
    document.getElementById("badge-evaluated").textContent = `${(notasComputadas * 100).toFixed(0)}% evaluado`;
    
    const minPosible = resumenPP.Minimo;
    const maxPosible = resumenPP.Maximo;
    const rangoTotal = maxPosible - minPosible;

    document.getElementById("limit-floor").textContent = minPosible.toFixed(2);
    document.getElementById("limit-ceiling").textContent = maxPosible.toFixed(2);
    
    const metaNecesariaGeneral = resumen.metasTemporales ? resumen.metasTemporales["PP"] : null;
    const reqCard = document.getElementById("tarjeta-necesaria");
    const reqText = document.getElementById("metric-required");
    const badgeRestante = document.getElementById("badge-remaining");

    const pesoFaltante = 1 - notasComputadas;
    badgeRestante.textContent = `${(pesoFaltante * 100).toFixed(0)}% restante`;

    if (metaNecesariaGeneral !== null) {
        const dispongo = arbolMemoria.puntosDisponibles(false);
        const tengo = arbolMemoria.puntos(false);
        const necesito = metaDeseada - tengo;
        const notaFaltantePura = dispongo > 0 ? (necesito / dispongo) * 10 : 0;

        if (notaFaltantePura > 10) {
            reqText.textContent = "Imp";
            insight.innerHTML = `Matemáticamente no puedes alcanzar la meta de <strong>${metaDeseada.toFixed(2)}</strong>.`;
            reqCard.style.borderColor = "#ef4444";
        } else if (notaFaltantePura <= 0) {
            reqText.textContent = "0.00";
            insight.innerHTML = `Meta asegurada. Ya superaste los puntos necesarios.`;
            reqCard.style.borderColor = "var(--border-subtle)";
        } else {
            reqText.textContent = notaFaltantePura.toFixed(2);
            insight.innerHTML = `Necesitas promediar <strong>${notaFaltantePura.toFixed(2)}</strong> en las notas faltantes para la meta.`;
            reqCard.style.borderColor = "var(--border-subtle)";
        }
    }

    if (rangoTotal > 0) {
        let porcentajeSiete = ((7 - minPosible) / rangoTotal) * 100;
        porcentajeSiete = Math.max(0, Math.min(100, porcentajeSiete)); 

        const fill = document.getElementById("slider-fill");
        fill.style.width = "100%";
        fill.style.background = `linear-gradient(90deg, #ef4444 0%, #ef4444 ${porcentajeSiete}%, #1d72dd ${porcentajeSiete}%, #1d72dd 100%)`;

        const posicionYo = Math.max(0, Math.min(100, ((promActual - minPosible) / rangoTotal) * 100));
        document.getElementById("slider-pin-user").style.left = `${posicionYo}%`;

        let posicionMeta = Math.max(0, Math.min(100, ((metaDeseada - minPosible) / rangoTotal) * 100));
        document.getElementById("slider-pin-target").style.left = `${posicionMeta}%`;
    }
}
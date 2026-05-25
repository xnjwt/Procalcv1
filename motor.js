class NodoNota {
    constructor(id, peso, nota = null) {
        this.id = id;
        this.peso = peso;
        this.nota = nota;
    }

    buscar(nodoid) {
        if (this.id === nodoid) return this;
        return null;
    }

    actualizarNota(nuevaNota) {
        this.nota = nuevaNota;
        return true;
    }

    tieneNota() {
        return this.nota !== null && this.nota !== undefined;
    }

    puntos(conPeso = true) {
        const pts = this.tieneNota() ? this.nota : 0;
        return conPeso ? pts * this.peso : pts;
    }

    puntosMax(conPeso = true) {
        const pts = !this.tieneNota() ? 10 : this.nota;
        return conPeso ? pts * this.peso : pts;
    }

    puntosMin() {
        return (!this.tieneNota() ? 0 : this.nota) * this.peso;
    }

    notasComputadas() {
        return this.tieneNota() ? this.peso : 0;
    }

    puntosDisponibles() {
        return !this.tieneNota() ? 10 * this.peso : 0;
    }

    _repartir(meta, resumen = null) {
        if (resumen && resumen.metasTemporales) {
            resumen.metasTemporales[this.id] = meta;
        }
    }

    resumenMinimo() {
        return {
            id: this.id,
            nota: this.tieneNota() ? this.puntos(false) : null
        };
    }
}

class NodoGrupo {
    constructor(id, peso, hijos) {
        this.id = id;
        this.peso = peso;
        this.hijos = hijos;
    }

    puntos(conPeso = true) {
        const pSinPeso = this.hijos.reduce((sum, h) => sum + h.puntos(), 0);
        return conPeso ? pSinPeso * this.peso : pSinPeso;
    }

    promedioActual() {
        const comp = this.notasComputadas();
        if (comp <= 0) return null;
        return this.puntos() / comp;
    }

    puntosMax(conPeso = true) {
        const pSinPeso = this.hijos.reduce((sum, h) => sum + h.puntosMax(), 0);
        return conPeso ? pSinPeso * this.peso : pSinPeso;
    }

    puntosMin(conPeso = true) {
        const pSinPeso = this.hijos.reduce((sum, h) => sum + h.puntosMin(), 0);
        return conPeso ? pSinPeso * this.peso : pSinPeso;
    }

    notasComputadas(conPeso = true) {
        const pSinPeso = this.hijos.reduce((sum, h) => sum + h.notasComputadas(), 0);
        return conPeso ? pSinPeso * this.peso : pSinPeso;
    }

    puntosDisponibles(conPeso = true) {
        if (this.tieneNota()) return 0;
        const pSinPeso = this.hijos.reduce((sum, h) => sum + h.puntosDisponibles(), 0);
        return conPeso ? pSinPeso * this.peso : pSinPeso;
    }

    tieneNota() {
        return this.hijos.every(h => h.tieneNota());
    }

    hijosSinNota() {
        return this.hijos.every(h => !h.tieneNota());
    }

    repartirHijosSinNota(meta, resumen) {
        const hijosAlcanzanMeta = this.hijos.every(h => meta <= h.puntosMax(false));

        if (hijosAlcanzanMeta) {
            this.hijos.forEach(h => h._repartir(meta, resumen));
            return;
        }

        let cantidadHijos = this.hijos.length;
        let metaTotal = meta * this.hijos.length;
        const hijosOrdenados = [...this.hijos].sort((a, b) => a.puntosMax() - b.puntosMax());

        hijosOrdenados.forEach(h => {
            const metaIndividual = metaTotal / cantidadHijos;
            const metaOMaxima = Math.min(metaIndividual, h.puntosMax(false));
            h._repartir(metaOMaxima, resumen);
            metaTotal -= metaOMaxima;
            cantidadHijos -= 1;
        });
    }

    _repartir(meta, resumen) {
        if (resumen && resumen.metasTemporales) {
            resumen.metasTemporales[this.id] = meta;
        }

        if (this.tieneNota()) {
            resumen[this.id] = this.resumenBasico("lleno");
            return;
        }

        if (this.hijosSinNota()) {
            resumen[this.id] = this.resumenBasico("vacio", meta);
            this.repartirHijosSinNota(meta, resumen);
            return;
        }

        resumen[this.id] = this.resumenBasico("algunHijo", meta);

        const tengo = this.puntos(false);
        const necesito = meta - tengo;
        const dispongo = this.puntosDisponibles(false);

        this.hijos.forEach(h => {
            const dispongoHijo = h.puntosDisponibles();
            const nuevaMeta = (dispongoHijo / dispongo) * necesito;
            h._repartir(nuevaMeta / h.peso, resumen);
        });
    }

    resumenCon(notaDeseada) {
        let meta = notaDeseada > this.puntosMax() ? this.puntosMax() : notaDeseada;
        const resumenFinal = { metasTemporales: {} };
        this._repartir(meta, resumenFinal);
        return resumenFinal;
    }

    resumenBasico(estado, meta = null) {
        let esfuerzo = null;
        if (this.promedioActual()) {
            esfuerzo = (meta / this.promedioActual()) - 1;
        }

        return {
            ...this.resumenMinimo(),
            Maximo: this.puntosMax(false),
            Minimo: this.puntosMin(false),
            promedio_actual: this.promedioActual(),
            notas_computadas: this.notasComputadas(false),
            meta: meta,
            esfuerzo: esfuerzo,
            hijos: this.hijos.map(h => h.resumenMinimo()),
            estado: estado
        };
    }

    resumenMinimo() {
        return {
            id: this.id,
            nota: this.tieneNota() ? this.puntos(false) : null
        };
    }

    buscar(nodoid) {
        if (this.id === nodoid) return this;
        for (let h of this.hijos) {
            const res = h.buscar(nodoid);
            if (res) return res;
        }
        return null;
    }

    actualizarHijos(nodoid, hijos) {
        const res = this.buscar(nodoid);
        if (res) {
            res.hijos = hijos;
            return true;
        }
        return false;
    }
}

class MotorGestor {
    constructor() {
        this.claveStorage = "SGP_materias";
    }

    _obtenerDatos() {
        const datos = localStorage.getItem(this.claveStorage);
        return datos ? JSON.parse(datos) : {};
    }

    _guardarDatos(datos) {
        localStorage.setItem(this.claveStorage, JSON.stringify(datos));
    }

    _reconstruirArbol(data) {
        if (data.hijos) {
            const hijosReconstruidos = data.hijos.map(h => this._reconstruirArbol(h));
            return new NodoGrupo(data.id, data.peso, hijosReconstruidos);
        } else {
            return new NodoNota(data.id, data.peso, data.nota);
        }
    }

    crearActualizarMateria(nombre, arbolObjeto) {
        const datos = this._obtenerDatos();
        datos[nombre] = arbolObjeto;
        this._guardarDatos(datos);
    }

    listarMaterias() {
        const datos = this._obtenerDatos();
        const listado = [];

        for (const [nombre, estructura] of Object.entries(datos)) {
            const arbol = this._reconstruirArbol(estructura);
            const promAct = arbol.promedioActual();
            const estaLlena = arbol.tieneNota();
            let estado = "pendiente";

            if (estaLlena) {
                estado = promAct >= 7 ? "aprobada" : "reprobada";
            }

            listado.push({
                nombre: nombre,
                estado: estado,
                promedio_actual: promAct
            });
        }

        return listado;
    }

    mostrarMateria(nombre) {
        const datos = this._obtenerDatos();
        if (!datos[nombre]) return null;
        return this._reconstruirArbol(datos[nombre]);
    }

    actualizarNota(nombreMateria, idNodo, nuevaNota) {
        const arbol = this.mostrarMateria(nombreMateria);
        if (!arbol) return false;

        const nodo = arbol.buscar(idNodo);
        if (!nodo || !(nodo instanceof NodoNota)) return false;

        nodo.actualizarNota(nuevaNota);
        this.crearActualizarMateria(nombreMateria, arbol);
        return true;
    }

    editarPonderacion(nombreMateria, idNodo, nuevoPeso) {
        const arbol = this.mostrarMateria(nombreMateria);
        if (!arbol) return false;

        const nodo = arbol.buscar(idNodo);
        if (!nodo) return false;

        nodo.peso = nuevoPeso;
        this.crearActualizarMateria(nombreMateria, arbol);
        return true;
    }

    calcularDatos(nombreMateria, notaDeseada) {
        const arbol = this.mostrarMateria(nombreMateria);
        if (!arbol) return null;
        return arbol.resumenCon(notaDeseada);
    }
}
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { 
  Lock, LogOut, Plus, Pencil, Trash2, Eye, EyeOff, 
  Upload, Search, ArrowLeft, Save, X, Sparkles, Package, Scissors, Layers 
} from 'lucide-react'

const STORAGE_URL = 'https://ddgpwnxjkzhvrsouijcq.supabase.co/storage/v1/object/public/catalogo'

export default function AdminPanel({ alVolver }) {
  const [sesion, setSesion] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorLogin, setErrorLogin] = useState('')
  const [cargandoAuth, setCargandoAuth] = useState(true)

  // Estados de datos
  const [tabActiva, setTabActiva] = useState('productos') // 'productos' | 'servicios' | 'categorias'
  const [productos, setProductos] = useState([])
  const [servicios, setServicios] = useState([])
  const [categorias, setCategorias] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [cargandoDatos, setCargandoDatos] = useState(false)

  // Estados del Modal de Creación/Edición
  const [modalAbierto, setModalAbierto] = useState(false)
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({})

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesion(session)
      setCargandoAuth(false)
      if (session) cargarTodo()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesion(session)
      if (session) cargarTodo()
    })

    return () => subscription.unsubscribe()
  }, [])

  async function iniciarSesion(e) {
    e.preventDefault()
    setErrorLogin('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setErrorLogin('Correo o contraseña incorrectos.')
    }
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
  }

  async function cargarTodo() {
    setCargandoDatos(true)
    const [resCat, resProd, resServ] = await Promise.all([
      supabase.from('categorias').select('*').order('id'),
      supabase.from('productos').select('*, categorias(nombre)').order('id', { ascending: false }),
      supabase.from('servicios').select('*, categorias(nombre)').order('id', { ascending: false })
    ])
    if (resCat.data) setCategorias(resCat.data)
    if (resProd.data) setProductos(resProd.data)
    if (resServ.data) setServicios(resServ.data)
    setCargandoDatos(false)
  }

  // Limpiador automático de nombres de archivo (elimina #, ñ, tildes y espacios)
  async function subirImagenStorage(e) {
    const archivo = e.target.files?.[0]
    if (!archivo) return

    setSubiendoImagen(true)
    const extension = archivo.name.split('.').pop().toLowerCase()
    const nombreBase = archivo.name
      .replace(/\.[^/.]+$/, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quita tildes
      .replace(/ñ/gi, 'n')
      .replace(/[^a-zA-Z0-9-]/g, '-') // Reemplaza #, espacios y símbolos por guiones
      .replace(/-+/g, '-')

    const nombreFinal = `${nombreBase}-${Date.now()}.${extension}`

    const { error } = await supabase.storage
      .from('catalogo')
      .upload(nombreFinal, archivo, { upsert: true })

    if (error) {
      alert('Error al subir la imagen: ' + error.message)
    } else {
      const { data } = supabase.storage.from('catalogo').getPublicUrl(nombreFinal)
      setForm((prev) => ({ ...prev, imagen_url: data.publicUrl }))
    }
    setSubiendoImagen(false)
  }

  // Abrir modal para nuevo registro o editar existente
  function abrirModalNuevo() {
    if (tabActiva === 'productos') {
      const catDefault = categorias.find((c) => c.tipo === 'insumo')?.id || ''
      setForm({
        nombre: '',
        marca: 'Jean Nails',
        categoria_id: catDefault,
        descripcion: '',
        precio: '',
        stock: 10,
        imagen_url: '',
        destacado: false,
        activo: true
      })
    } else if (tabActiva === 'servicios') {
      const catDefault = categorias.find((c) => c.tipo === 'servicio')?.id || ''
      setForm({
        nombre: '',
        categoria_id: catDefault,
        descripcion: '',
        precio_desde: '',
        duracion_aprox: '60 min',
        destacado: true,
        activo: true
      })
    } else {
      setForm({
        nombre: '',
        tipo: 'insumo',
        descripcion: '',
        activo: true
      })
    }
    setModalAbierto(true)
  }

  function abrirModalEditar(item) {
    setForm({ ...item })
    setModalAbierto(true)
  }

  async function guardarRegistro(e) {
    e.preventDefault()
    setGuardando(true)

    let tabla = tabActiva
    let datos = { ...form }
    delete datos.categorias // Remover relación virtual antes de enviar a Supabase
    delete datos.created_at

    if (tabla === 'productos') {
      datos.precio = Number(datos.precio) || 0
      datos.stock = Number(datos.stock) || 0
      datos.categoria_id = datos.categoria_id ? Number(datos.categoria_id) : null
    } else if (tabla === 'servicios') {
      datos.precio_desde = Number(datos.precio_desde) || 0
      datos.categoria_id = datos.categoria_id ? Number(datos.categoria_id) : null
    }

    let resultado
    if (datos.id) {
      const idRegistro = datos.id
      delete datos.id
      resultado = await supabase.from(tabla).update(datos).eq('id', idRegistro)
    } else {
      resultado = await supabase.from(tabla).insert([datos])
    }

    setGuardando(false)
    if (resultado.error) {
      alert('Error al guardar: ' + resultado.error.message)
    } else {
      setModalAbierto(false)
      cargarTodo()
    }
  }

  // Cambio rápido de estado (Visible / Oculto) con un clic
  async function alternarActivo(tabla, item) {
    await supabase.from(tabla).update({ activo: !item.activo }).eq('id', item.id)
    cargarTodo()
  }

  // Eliminar registro
  async function eliminarRegistro(tabla, id, nombre) {
    if (!window.confirm(`¿Seguro que deseas eliminar "${nombre}" de forma permanente?`)) return
    const { error } = await supabase.from(tabla).delete().eq('id', id)
    if (error) alert('Error al eliminar: ' + error.message)
    else cargarTodo()
  }

  if (cargandoAuth) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-100">Cargando...</div>
  }

  // PANTALLA DE LOGIN SI NO HA INICIADO SESIÓN
  if (!sesion) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-pink-100 text-pink-600 rounded-2xl flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-extrabold text-stone-900">Panel Administrador</h1>
            <p className="text-sm text-stone-500">Jean Nails Store & Salón</p>
          </div>

          {errorLogin && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm text-center font-medium">
              {errorLogin}
            </div>
          )}

          <form onSubmit={iniciarSesion} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Correo Electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@jeannails.com"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-pink-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-pink-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold transition cursor-pointer"
            >
              Ingresar al Panel
            </button>
          </form>

          <button
            onClick={alVolver}
            className="w-full py-2.5 text-sm text-stone-500 hover:text-stone-800 flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a la tienda pública
          </button>
        </div>
      </div>
    )
  }

  // Filtrado de lista en el panel
  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.marca && p.marca.toLowerCase().includes(busqueda.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-stone-100 text-stone-800">
      {/* BARRA SUPERIOR DEL PANEL */}
      <header className="bg-stone-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md bg-pink-600 text-xs font-extrabold uppercase">Admin</span>
            <span className="font-bold text-sm sm:text-base truncate">Jean Nails — Gestión de Catálogo</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={alVolver}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-stone-800 hover:bg-stone-700 text-xs sm:text-sm font-medium transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Ver Tienda
            </button>
            <button
              onClick={cerrarSesion}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-600/20 text-red-300 hover:bg-red-600 hover:text-white text-xs sm:text-sm font-medium transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* PESTAÑAS DE NAVEGACIÓN Y BOTÓN NUEVO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTabActiva('productos')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
                tabActiva === 'productos' ? 'bg-pink-600 text-white shadow-xs' : 'bg-white text-stone-600'
              }`}
            >
              <Package className="w-4 h-4" /> Insumos ({productos.length})
            </button>
            <button
              onClick={() => setTabActiva('servicios')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
                tabActiva === 'servicios' ? 'bg-pink-600 text-white shadow-xs' : 'bg-white text-stone-600'
              }`}
            >
              <Scissors className="w-4 h-4" /> Servicios ({servicios.length})
            </button>
            <button
              onClick={() => setTabActiva('categorias')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
                tabActiva === 'categorias' ? 'bg-pink-600 text-white shadow-xs' : 'bg-white text-stone-600'
              }`}
            >
              <Layers className="w-4 h-4" /> Categorías ({categorias.length})
            </button>
          </div>

          <button
            onClick={abrirModalNuevo}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-pink-600 text-white text-sm font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {tabActiva === 'productos' ? 'Nuevo Producto' : tabActiva === 'servicios' ? 'Nuevo Servicio' : 'Nueva Categoría'}
          </button>
        </div>

        {/* BUSCADOR PARA PRODUCTOS */}
        {tabActiva === 'productos' && (
          <div className="relative mb-6">
            <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar insumo por nombre o marca para editar rápido..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-stone-200 text-sm focus:outline-none focus:border-pink-500 shadow-2xs"
            />
          </div>
        )}

        {/* TABLA / LISTA DE ELEMENTOS */}
        {cargandoDatos ? (
          <div className="text-center py-12 text-stone-400">Actualizando datos...</div>
        ) : tabActiva === 'productos' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {productosFiltrados.map((prod) => (
              <div
                key={prod.id}
                className={`bg-white rounded-2xl p-4 border transition flex gap-4 items-center ${
                  prod.activo ? 'border-stone-200' : 'border-red-200 bg-stone-50 opacity-70'
                }`}
              >
                <img
                  src={prod.imagen_url || `${STORAGE_URL}/logo.jpg`}
                  onError={(e) => { e.target.src = `${STORAGE_URL}/logo.jpg` }}
                  alt={prod.nombre}
                  className="w-20 h-20 rounded-xl object-cover bg-stone-100 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-pink-600 truncate">{prod.marca}</span>
                    {!prod.activo && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-600 rounded-full">Oculto</span>
                    )}
                  </div>
                  <h3 className="font-bold text-stone-900 text-sm truncate">{prod.nombre}</h3>
                  <p className="text-xs text-stone-400 truncate">{prod.categorias?.nombre}</p>
                  <p className="text-base font-extrabold text-stone-900 mt-1">
                    S/ {Number(prod.precio).toFixed(2)}
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => abrirModalEditar(prod)}
                    title="Editar"
                    className="p-2 rounded-lg bg-stone-100 hover:bg-pink-600 hover:text-white text-stone-600 transition cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => alternarActivo('productos', prod)}
                    title={prod.activo ? 'Ocultar en tienda' : 'Mostrar en tienda'}
                    className={`p-2 rounded-lg transition cursor-pointer ${
                      prod.activo ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-200 text-stone-500'
                    }`}
                  >
                    {prod.activo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => eliminarRegistro('productos', prod.id, prod.nombre)}
                    title="Eliminar"
                    className="p-2 rounded-lg bg-red-50 hover:bg-red-600 hover:text-white text-red-600 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : tabActiva === 'servicios' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {servicios.map((serv) => (
              <div key={serv.id} className="bg-white rounded-2xl p-5 border border-stone-200 flex justify-between items-center gap-4">
                <div>
                  <span className="text-xs font-bold text-pink-600">Duración: {serv.duracion_aprox}</span>
                  <h3 className="font-bold text-lg text-stone-900">{serv.nombre}</h3>
                  <p className="text-sm text-stone-500 mt-1">{serv.descripcion}</p>
                  <p className="text-lg font-extrabold text-pink-600 mt-2">
                    Desde S/ {Number(serv.precio_desde).toFixed(2)}
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => abrirModalEditar(serv)}
                    className="p-2.5 rounded-xl bg-stone-100 hover:bg-pink-600 hover:text-white transition cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => eliminarRegistro('servicios', serv.id, serv.nombre)}
                    className="p-2.5 rounded-xl bg-red-50 hover:bg-red-600 hover:text-white text-red-600 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categorias.map((cat) => (
              <div key={cat.id} className="bg-white rounded-2xl p-5 border border-stone-200 flex justify-between items-center">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-pink-50 text-pink-600 uppercase">
                    {cat.tipo}
                  </span>
                  <h3 className="font-bold text-base text-stone-900 mt-1">{cat.nombre}</h3>
                  <p className="text-xs text-stone-500">{cat.descripcion}</p>
                </div>
                <button
                  onClick={() => abrirModalEditar(cat)}
                  className="p-2.5 rounded-xl bg-stone-100 hover:bg-pink-600 hover:text-white transition cursor-pointer"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL PARA CREAR O EDITAR */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h3 className="text-lg font-extrabold text-stone-900">
                {form.id ? 'Editar Registro' : 'Nuevo Registro'}
              </h3>
              <button
                onClick={() => setModalAbierto(false)}
                className="p-2 rounded-full hover:bg-stone-100 text-stone-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={guardarRegistro} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={form.nombre || ''}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm"
                />
              </div>

              {tabActiva === 'productos' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Marca</label>
                      <input
                        type="text"
                        value={form.marca || ''}
                        onChange={(e) => setForm({ ...form, marca: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Precio (S/)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={form.precio ?? ''}
                        onChange={(e) => setForm({ ...form, precio: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-bold text-pink-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Categoría</label>
                    <select
                      value={form.categoria_id || ''}
                      onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm bg-white"
                    >
                      {categorias.filter((c) => c.tipo === 'insumo').map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                      ))}
                    </select>
                  </div>

                  {/* SUBIDA DE IMAGEN DIRECTA A SUPABASE */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Fotografía del Producto</label>
                    <div className="flex items-center gap-4">
                      {form.imagen_url && (
                        <img
                          src={form.imagen_url}
                          alt="Vista previa"
                          className="w-16 h-16 rounded-xl object-cover border border-stone-200 shrink-0"
                        />
                      )}
                      <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-pink-300 bg-pink-50/50 text-pink-600 text-xs font-bold hover:bg-pink-50 transition cursor-pointer">
                        <Upload className="w-4 h-4" />
                        {subiendoImagen ? 'Subiendo foto a la nube...' : 'Subir foto desde PC o Celular'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={subirImagenStorage}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </>
              )}

              {tabActiva === 'servicios' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Precio Desde (S/)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={form.precio_desde ?? ''}
                      onChange={(e) => setForm({ ...form, precio_desde: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Duración Aprox.</label>
                    <input
                      type="text"
                      value={form.duracion_aprox || ''}
                      onChange={(e) => setForm({ ...form, duracion_aprox: e.target.value })}
                      placeholder="Ej. 60 min"
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm"
                    />
                  </div>
                </div>
              )}

              {tabActiva === 'categorias' && (
                <div>
                  <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Tipo de Categoría</label>
                  <select
                    value={form.tipo || 'insumo'}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm bg-white"
                  >
                    <option value="insumo">Insumo (Tienda)</option>
                    <option value="servicio">Servicio (Salón)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Descripción</label>
                <textarea
                  rows="3"
                  value={form.descripcion || ''}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.activo ?? true}
                    onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                    className="w-4 h-4 accent-pink-600"
                  />
                  Visible en la web
                </label>

                {tabActiva !== 'categorias' && (
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.destacado ?? false}
                      onChange={(e) => setForm({ ...form, destacado: e.target.checked })}
                      className="w-4 h-4 accent-pink-600"
                    />
                    Destacar primero
                  </label>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-600 font-bold text-sm hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando || subiendoImagen}
                  className="flex-1 py-3 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
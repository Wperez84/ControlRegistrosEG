export interface Producto {
  id: string; nombre: string;
  tipo: 'evento' | 'campana' | 'serie' | 'torneo' | 'otro';
  color?: string; descripcion?: string; fechaInicio?: string; fechaFin?: string;
  activo: boolean; creadoEn: number; creadoPor: string;
}
export interface Cliente { id: string; nombre: string; color: string; activo: boolean; creadoEn: number; }
export type Red = 'INSTAGRAM' | 'FACEBOOK' | 'YOUTUBE' | 'X' | 'TIKTOK' | 'SITIO WEB' | 'OTRO';
export type Marca = string;
export interface Registro {
  id: string; productoId: string; clienteId: string; red: Red; marca: Marca;
  link: string; seccion?: string; categoria?: string; fecha: string;
  notas?: string; creadoEn: number; creadoPor: string; guardado?: boolean;
}
export interface Metrica { registroId: string; alcances?: number; interacciones?: number; actualizadoEn: number; }
export interface UsuarioInterno { uid: string; email: string; rol: 'admin' | 'editor'; }
export interface RegistroCompleto extends Registro {
  alcances?: number; interacciones?: number;
  productoNombre?: string; productoColor?: string;
  clienteNombre?: string; clienteColor?: string;
}

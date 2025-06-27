import { DarkMode, Gradient, LightMode } from "../Icon";

export function PluginIcon({ id, color }) {
  return (

    <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-plug" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke={`url(#${id}-gradient-dark)`} fill="none" stroke-linecap="round" stroke-linejoin="round"
    >
      <defs>
        <Gradient
          id={`${id}-gradient`}
          color={color}
          gradientTransform="matrix(0 21 -21 0 12 11)"
        />
        <Gradient
          id={`${id}-gradient-dark`}
          color={color}
          gradientTransform="matrix(0 11.5 -24.5 0 16 5.5)"
        />
      </defs>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M9.785 6l8.215 8.215l-2.054 2.054a5.81 5.81 0 1 1 -8.215 -8.215l2.054 -2.054z" /><path d="M4 20l3.5 -3.5" /><path d="M15 4l-3.5 3.5" /><path d="M20 9l-3.5 3.5" /></svg>
  )
}

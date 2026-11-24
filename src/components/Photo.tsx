const base = import.meta.env.BASE_URL
type Props = { name: string; alt: string; sizes: string; className?: string }

export function Photo({ name, alt, sizes, className }: Props) {
  return (
    <span className={`photo ${className ?? ''}`}>
      <img src={`${base}photos/${name}-640.webp`} srcSet={`${base}photos/${name}-640.webp 640w, ${base}photos/${name}-1280.webp 1280w`} sizes={sizes} width={640} height={480} alt={alt} loading="lazy" decoding="async" />
    </span>
  )
}

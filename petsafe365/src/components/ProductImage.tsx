import { ToyArt } from "@/components/ToyArt";
import type { Product } from "@/lib/types";

/** 실제 상품 사진이 있으면 사진을, 없으면 그림 아이콘을 보여 준다. */
export function ProductImage({ product, className = "" }: { product: Pick<Product, "image_url" | "material" | "name">; className?: string }) {
  if (product.image_url) {
    // 정적 파일을 그대로 쓴다. 사진이 작아서 이미지 최적화는 쓰지 않는다.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={product.image_url} alt={`${product.name} 사진`} loading="lazy" className={`h-full w-full object-contain mix-blend-multiply ${className}`} />;
  }
  return <ToyArt material={product.material} className={`h-3/4 w-3/4 text-ink ${className}`} />;
}

import type { SupplierCatalogItem } from "../../lib/buyer-api"
import { useBuyerLocale } from "../../lib/locale"
import { EmptyState, ErrorState, LoadingState } from "../ui/States"
import { CatalogBlankCard } from "./CatalogBlankCard"

type StoreCatalogResultsProps = {
  loading: boolean
  error?: string
  items: SupplierCatalogItem[]
  hasFilters: boolean
  openingId?: number | null
  onRetry: () => void
  onViewDetail: (item: SupplierCatalogItem) => void
  onDesignNow: (item: SupplierCatalogItem) => void
  canLoadMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
}

export function StoreCatalogResults({
  loading,
  error,
  items,
  hasFilters,
  openingId,
  onRetry,
  onViewDetail,
  onDesignNow,
  canLoadMore,
  loadingMore,
  onLoadMore,
}: StoreCatalogResultsProps) {
  const { t } = useBuyerLocale()

  if (loading) return <LoadingState label={t("catalogLoading")} />
  if (error && !items.length) {
    return <ErrorState message={error} action={{ label: "Try again", onClick: onRetry }} />
  }
  if (!items.length) {
    return (
      <EmptyState
        title={hasFilters ? t("catalogEmptyFiltered") : t("catalogEmpty")}
        message={hasFilters ? t("catalogEmptyFilteredHint") : t("catalogEmptyHint")}
      />
    )
  }

  return (
    <>
      <section className="buyer-shop-product-grid" aria-label={t("catalogTitle")}>
        {items.map((item) => (
          <div key={item.id}>
            <CatalogBlankCard
              item={item}
              opening={openingId === item.id}
              onViewDetail={onViewDetail}
              onDesignNow={onDesignNow}
            />
          </div>
        ))}
      </section>
      {canLoadMore && onLoadMore ? (
        <div className="buyer-shop-catalog-more">
          <button type="button" className="buyer-ui-button buyer-ui-button--ghost" disabled={loadingMore} onClick={onLoadMore}>
            {loadingMore ? t("catalogLoadingMore") : t("catalogLoadMore")}
          </button>
        </div>
      ) : null}
    </>
  )
}

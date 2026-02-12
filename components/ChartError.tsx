export default function ChartError() {
    return (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
                Chart data unavailable from API. Showing simulated data based on current price.
            </p>
        </div>
    )
}
import { RefreshCw } from "lucide-react";

export default function ChartLoading() {
    return (
        <div className="h-[400px] flex items-center justify-center">
            <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading chart data...</p>
            </div>
        </div>
    )
}
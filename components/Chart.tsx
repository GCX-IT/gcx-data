/* eslint-disable @next/next/no-img-element */
import { BarChart3, TrendingUpIcon } from "lucide-react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import ChartError from "./ChartError"
import ChartLoading from "./ChartLoading"
import { ChartContainer, ChartTooltip } from "./ui/chart"
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { formatPercentage, formatPrice } from "@/lib/format"

interface ChartData {
    timestamp: number
    date: string
    time: string
    price: number
    open?: number
    high?: number
    low?: number
    close?: number
}

type ChartType = "line" | "candlestick"

interface Crypto {
    id: string;
    name: string;
    symbol: string;
    image: string;
    current_price: number;
    price_change_percentage_24h: number;
    market_cap_rank: number;
    market_cap: number;
    total_volume: number;
}

interface Chart {
    cryptoData: Crypto[];
    selectedCrypto: string;
    chartType: ChartType;
    setChartType: (type: ChartType) => void;
    chartError: string | null;
    chartLoading: boolean;
    chartData: ChartData[];
}

const CandlestickChart = ({ data }: { data: ChartData[] }) => {
    const processedData = data.map((item) => ({
        ...item,
        range: [item.low || 0, item.high || 0],
        openClose: [item.open || 0, item.close || 0],
    }))

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} interval={Math.floor(data.length / 8)} />
                <YAxis
                    tick={{ fontSize: 12 }}
                    domain={["dataMin - 100", "dataMax + 100"]}
                    tickFormatter={(value) => `$${value.toFixed(0)}`}
                />
                <ChartTooltip
                    content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                            const data = payload[0].payload as ChartData
                            return (
                                <div className="bg-background border rounded-lg p-3 shadow-lg">
                                    <p className="font-medium">
                                        {data.date} {label}
                                    </p>
                                    <div className="space-y-1 text-sm">
                                        <p>Open: {formatPrice(data.open || 0)}</p>
                                        <p>High: {formatPrice(data.high || 0)}</p>
                                        <p>Low: {formatPrice(data.low || 0)}</p>
                                        <p>Close: {formatPrice(data.close || 0)}</p>
                                    </div>
                                </div>
                            )
                        }
                        return null
                    }}
                />
                <Bar dataKey="high" fill="hsl(var(--chart-1))" opacity={0.6} />
            </BarChart>
        </ResponsiveContainer>
    )
}

export default function Chart({ cryptoData, selectedCrypto, chartType, setChartType, chartError, chartLoading, chartData }: Chart) {

    const getSelectedCryptoData = () => {
        return cryptoData.find((crypto) => crypto.id === selectedCrypto)
    }

    const selectedCryptoInfo = getSelectedCryptoData()

    return (
        <Card className="mb-8">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        {selectedCryptoInfo && (
                            <>
                                <img
                                    src={selectedCryptoInfo.image || "/placeholder.svg"}
                                    alt={selectedCryptoInfo.name}
                                    className="w-8 h-8 rounded-full"
                                />
                                <div>
                                    <CardTitle className="text-xl">{selectedCryptoInfo.name} Price Chart</CardTitle>
                                    <p className="text-muted-foreground">
                                        {formatPrice(selectedCryptoInfo.current_price)}
                                        <span
                                            className={`ml-2 ${selectedCryptoInfo.price_change_percentage_24h >= 0 ? "text-green-500" : "text-red-500"}`}
                                        >
                                            {formatPercentage(selectedCryptoInfo.price_change_percentage_24h)}
                                        </span>
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="flex space-x-2">
                        <Button
                            variant={chartType === "line" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setChartType("line")}
                        >
                            <TrendingUpIcon className="w-4 h-4 mr-2" />
                            Line
                        </Button>
                        <Button
                            variant={chartType === "candlestick" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setChartType("candlestick")}
                        >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Candlestick
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {chartError && (
                    <ChartError />
                )}
                {chartLoading ? (
                    <ChartLoading />
                ) : (
                    <ChartContainer
                        config={{
                            price: {
                                label: "Price",
                                color: "#3b82f6",
                            },
                        }}
                        className="h-[400px] w-full"
                    >
                        {chartType === "line" ? (
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="time" tick={{ fontSize: 12 }} interval={Math.floor(chartData.length / 8)} />
                                    <YAxis
                                        tick={{ fontSize: 12 }}
                                        domain={["dataMin - 100", "dataMax + 100"]}
                                        tickFormatter={(value) => `$${value.toFixed(0)}`}
                                    />
                                    <ChartTooltip
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload as ChartData
                                                return (
                                                    <div className="bg-background border rounded-lg p-3 shadow-lg">
                                                        <p className="font-medium">
                                                            {data.date} {label}
                                                        </p>
                                                        <p className="text-sm">Price: {formatPrice(payload[0].value as number)}</p>
                                                    </div>
                                                )
                                            }
                                            return null
                                        }}
                                    />
                                    <Line type="monotone" dataKey="price" stroke="var(--color-price)" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <CandlestickChart data={chartData} />
                        )}
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    )
}
/* eslint-disable @next/next/no-img-element */
import { TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { formatMarketCap, formatPercentage, formatPrice } from "@/lib/format";

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

export default function CryptoCard({ cryptoData, selectedCrypto, handleCryptoSelect }: { cryptoData: Crypto[], selectedCrypto: string, handleCryptoSelect: (id: string) => void }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {cryptoData.map((crypto) => (
                <Card
                    key={crypto.id}
                    className={`hover:shadow-lg transition-all cursor-pointer ${selectedCrypto === crypto.id ? "ring-2 ring-primary" : ""
                        }`}
                    onClick={() => handleCryptoSelect(crypto.id)}
                >
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <img
                                    src={crypto.image || "/placeholder.svg"}
                                    alt={crypto.name}
                                    className="w-8 h-8 rounded-full"
                                />
                                <div>
                                    <CardTitle className="text-lg">{crypto.name}</CardTitle>
                                    <p className="text-sm text-muted-foreground uppercase">{crypto.symbol}</p>
                                </div>
                            </div>
                            <Badge variant="secondary">#{crypto.market_cap_rank}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div>
                                <p className="text-2xl font-bold">{formatPrice(crypto.current_price)}</p>
                            </div>

                            <div className="flex items-center space-x-2">
                                {crypto.price_change_percentage_24h >= 0 ? (
                                    <TrendingUp className="w-4 h-4 text-green-500" />
                                ) : (
                                    <TrendingDown className="w-4 h-4 text-red-500" />
                                )}
                                <span
                                    className={`text-sm font-medium ${crypto.price_change_percentage_24h >= 0 ? "text-green-500" : "text-red-500"
                                        }`}
                                >
                                    {formatPercentage(crypto.price_change_percentage_24h)}
                                </span>
                                <span className="text-xs text-muted-foreground">24h</span>
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Market Cap</span>
                                    <span className="font-medium">{formatMarketCap(crypto.market_cap)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Volume 24h</span>
                                    <span className="font-medium">{formatMarketCap(crypto.total_volume)}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
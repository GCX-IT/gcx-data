import { RefreshCw } from "lucide-react";
import { Button } from "./ui/button";

interface ErrorLoadingDataProps {
    error: string;
    fetchCryptoData: () => void;
}

export default function ErrorLoadingData({ error, fetchCryptoData }: ErrorLoadingDataProps) {
    return (
        <div className="min-h-screen bg-background p-4">
            <div className="max-w-7xl mx-auto">
                <div className="text-center py-12">
                    <h1 className="text-2xl font-bold text-destructive mb-4">Error Loading Data</h1>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button onClick={fetchCryptoData}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                    </Button>
                </div>
            </div>
        </div>
    );
}
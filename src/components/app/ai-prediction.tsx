"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Wand2, AlertTriangle, CheckCircle2, Loader } from "lucide-react"
import { PredictOrderStatusOutput } from "@/ai/flows/predict-order-status"
import { useToast } from "@/hooks/use-toast"
import type { Order } from "@/lib/types"
import { runPrediction } from "@/app/actions/predictionActions"

export function AIPrediction({ order }: { order: Order }) {
  const [prediction, setPrediction] = useState<PredictOrderStatusOutput | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handlePredict = async () => {
    setIsLoading(true)
    setPrediction(null)
    const result = await runPrediction(order)
    if (result.success) {
      setPrediction(result.data)
    } else {
      toast({
        variant: "destructive",
        title: "Prediction Failed",
        description: result.error,
      })
    }
    setIsLoading(false)
  }
  
  const getIcon = (likelihood: string) => {
    switch (likelihood.toLowerCase()) {
      case "high":
        return <AlertTriangle className="h-4 w-4" />
      case "medium":
        return <AlertTriangle className="h-4 w-4" />
      case "low":
        return <CheckCircle2 className="h-4 w-4" />
      default:
        return <Wand2 className="h-4 w-4" />
    }
  }

  const getVariant = (likelihood: string) => {
    switch (likelihood.toLowerCase()) {
      case "high":
        return "destructive"
      default:
        return "default"
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1.5">
          <CardTitle className="font-headline">AI Status Prediction</CardTitle>
          <CardDescription>
            Predict potential delays and get recommended actions.
          </CardDescription>
        </div>
        <Button onClick={handlePredict} disabled={isLoading}>
          {isLoading ? (
            <Loader className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          Predict Status
        </Button>
      </CardHeader>
      <CardContent>
        {prediction ? (
          <Alert variant={getVariant(prediction.delayLikelihood)}>
            {getIcon(prediction.delayLikelihood)}
            <AlertTitle>Delay Likelihood: {prediction.delayLikelihood}</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p><strong>Reason:</strong> {prediction.delayReason}</p>
              <p><strong>Recommendation:</strong> {prediction.recommendedActions}</p>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="flex items-center justify-center h-24 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
            Click "Predict Status" to analyze this order.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

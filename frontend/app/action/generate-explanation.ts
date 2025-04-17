"use server"

export async function generateExplanation(diseaseName: string | string[]): Promise<string> {
  // Check if diseaseName is an empty array
  if (Array.isArray(diseaseName) && diseaseName.length === 0) {
    return "No Information";
  }

  // This is a placeholder function that would typically call an API or database
  // to get detailed information about the disease
  return (
    diseaseInfo[diseaseName] ||
    "No Information"
  )
}

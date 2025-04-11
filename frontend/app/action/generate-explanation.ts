"use server"

export async function generateExplanation(diseaseName: string): Promise<string> {
  // This is a placeholder function that would typically call an API or database
  // to get detailed information about the disease

  const diseaseInfo: Record<string, string> = {
    healthy:
      "This rice leaf appears healthy with no visible signs of disease. Healthy rice leaves typically have a uniform green color without spots, lesions, or discoloration.",

    "Brown Spot":
      "Brown Spot (Cochliobolus miyabeanus) is characterized by brown, oval-shaped lesions with gray centers. It typically affects older leaves and can reduce grain quality and yield. The disease is favored by warm temperatures and high humidity.",

    "Bacterial Leaf Blight":
      "Bacterial Leaf Blight (Xanthomonas oryzae) causes water-soaked lesions that turn yellow-orange and eventually gray-white. It spreads rapidly in warm, humid conditions and can cause significant yield losses if infection occurs during the early growth stages.",

    "Rice Blast":
      "Rice Blast (Magnaporthe oryzae) is one of the most destructive rice diseases worldwide. It produces diamond-shaped lesions with gray centers and dark borders. The disease can affect all above-ground parts of the plant and is favored by cool temperatures and high humidity.",

    "Sheath Blight":
      "Sheath Blight (Rhizoctonia solani) initially appears as water-soaked, greenish-gray lesions on the leaf sheaths near the water line. These lesions enlarge and become oval with gray centers and brown borders. The disease can spread upward to the leaves and panicles.",

    Tungro:
      "Rice Tungro disease is caused by a virus complex transmitted by leafhoppers. Infected plants show yellow to orange discoloration, stunted growth, and reduced tillering. It can cause severe yield losses in susceptible varieties.",

    "no detection":
      "No specific disease patterns were detected in this image. This could mean the leaf is healthy, the disease is at an early stage, or the image quality is affecting analysis. Consider taking another photo with better lighting and focus, or consult with a plant pathologist for a more accurate diagnosis.",
  }

  return (
    diseaseInfo[diseaseName] ||
    "Information about this specific disease is not available. Please consult with a plant pathologist for accurate diagnosis and treatment recommendations."
  )
}

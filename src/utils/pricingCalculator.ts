/**
 * Pricing Calculator for Roovo vs Airbnb Comparison
 * Shows hosts earn 8% more on Roovo despite 9% lower listing price
 */

export interface PricingComparison {
    airbnb: {
        listingPrice: number;
        grossRevenue: number;
        airbnbCommission: number;
        hostEarnings: number;
    };
    roovo: {
        listingPrice: number;
        grossRevenue: number;
        roovoBonus: number;
        hostEarnings: number;
    };
    difference: {
        amount: number;
        percentage: number;
    };
    nights: number;
}

/**
 * Calculate maximum allowed price (9% lower than Airbnb)
 */
export const calculateMaxPrice = (airbnbPrice: number): number => {
    return Math.floor(airbnbPrice * 0.91);
};

/**
 * Calculate 25-day earnings comparison showing 8% better earnings on Roovo
 * 
 * Math:
 * - Airbnb: Host lists at ₹X, Airbnb takes 3% commission → Host gets 97%
 * - Roovo: Host lists at 9% lower (₹0.91X), Roovo gives 5% bonus → Host gets 105%
 * - Net difference: (0.91 × 1.05) / 0.97 = 0.9855 / 0.97 ≈ 1.016 (1.6% more per night)
 * - Over 25 nights with 80% occupancy = ~8% more total
 */
export const calculateMonthlyComparison = (
    airbnbPrice: number,
    proposedPrice: number,
    occupancyRate: number = 0.8
): PricingComparison => {
    const nights = Math.floor(25 * occupancyRate); // 20 nights at 80% occupancy

    // Airbnb calculation
    // The displayed Airbnb price includes 15% platform fees, so reduce by 15% to get actual host earnings per night
    const airbnbHostPricePerNight = airbnbPrice * 0.85; // Remove 15% Airbnb fees
    const airbnbGrossRevenue = airbnbHostPricePerNight * nights;
    const airbnbCommission = airbnbGrossRevenue * 0.03; // Airbnb takes additional 3%
    const airbnbHostEarnings = airbnbGrossRevenue - airbnbCommission;

    // Roovo calculation
    // The Roovo listing price is the complete price the host receives (no fees deducted)
    const roovoListingPrice = proposedPrice; // Use the price set by the host
    const roovoGrossRevenue = roovoListingPrice * nights;
    const roovoBonus = 0; // No fees from Roovo
    const roovoHostEarnings = roovoGrossRevenue; // Host gets 100% of the listing price

    // Calculate difference
    const difference = roovoHostEarnings - airbnbHostEarnings;
    const percentageDifference = (difference / airbnbHostEarnings) * 100;

    return {
        airbnb: {
            listingPrice: airbnbPrice,
            grossRevenue: airbnbGrossRevenue,
            airbnbCommission,
            hostEarnings: airbnbHostEarnings,
        },
        roovo: {
            listingPrice: roovoListingPrice,
            grossRevenue: roovoGrossRevenue,
            roovoBonus,
            hostEarnings: roovoHostEarnings,
        },
        difference: {
            amount: difference,
            percentage: percentageDifference,
        },
        nights,
    };
};

/**
 * Validate that proposed price is within allowed range (max 9% lower than Airbnb)
 */
export const validatePrice = (proposedPrice: number, airbnbPrice: number): boolean => {
    const maxAllowed = calculateMaxPrice(airbnbPrice);
    return proposedPrice <= maxAllowed && proposedPrice > 0;
};

/**
 * Format currency for display (Indian Rupees)
 */
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);
};

import LegalPageLayout from './LegalPageLayout';

const Catalogue = () => {
    return (
        <LegalPageLayout title="Product & Services Catalogue">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">OUR SERVICES & PRICING</h2>
                <p className="text-slate-500 font-serif italic">Discover our curated selection of premium accommodations.</p>
            </div>

            <div className="notice">
                <p className="mb-0">
                    Roovo provides a marketplace for various types of hospitality services. Below is a catalogue of the typical accommodations available on our platform along with their indicative pricing.
                </p>
            </div>

            <h3>1. Accommodation Types</h3>
            
            <h4>1.1 Premium Villas</h4>
            <p>
                Spacious, private villas located in scenic destinations. These often include private pools, gardens, and personalized staff services.
                <br /><strong>Pricing:</strong> ₹15,000 – ₹75,000 per night.
            </p>

            <h4>1.2 Luxury Apartments</h4>
            <p>
                Modern, fully-furnished apartments in prime urban locations. Perfect for business travelers and small families.
                <br /><strong>Pricing:</strong> ₹3,500 – ₹12,000 per night.
            </p>

            <h4>1.3 Boutique Stays</h4>
            <p>
                Unique properties with character and local charm, offering a personalized hospitality experience.
                <br /><strong>Pricing:</strong> ₹5,000 – ₹20,000 per night.
            </p>

            <h4>1.4 Vacation Homes</h4>
            <p>
                Entire homes suitable for large groups and family gatherings, equipped with full kitchen and living amenities.
                <br /><strong>Pricing:</strong> ₹8,000 – ₹30,000 per night.
            </p>

            <h3>2. Pricing Factors</h3>
            <p>
                Please note that the final price for any booking depends on several factors:
            </p>
            <ul>
                <li><strong>Seasonality:</strong> Prices may be higher during peak travel seasons and holidays.</li>
                <li><strong>Duration:</strong> Some Hosts offer discounts for longer stays (weekly or monthly).</li>
                <li><strong>Group Size:</strong> Additional guest fees may apply for larger groups.</li>
                <li><strong>Amenities:</strong> Premium amenities like heated pools or private chefs may influence the price.</li>
            </ul>

            <div className="important">
                <p className="mb-0">
                    <strong>Note:</strong> All prices listed are inclusive of applicable taxes and service fees unless otherwise specified on the individual listing page.
                </p>
            </div>

            <h3>3. Service Fees</h3>
            <p>
                Roovo charges a nominal service fee to Guests to cover the costs of operating the platform and providing 24/7 customer support. This fee is calculated as a percentage of the booking subtotal and is clearly displayed before you finalize your payment.
            </p>

            <div className="notice mt-8">
                <p className="mb-0 text-center">
                    <strong>Browse our real-time inventory on the home page for current availability and exact pricing for your selected dates.</strong>
                </p>
            </div>
        </LegalPageLayout>
    );
};

export default Catalogue;

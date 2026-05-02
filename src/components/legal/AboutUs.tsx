import LegalPageLayout from './LegalPageLayout';

const AboutUs = () => {
    return (
        <LegalPageLayout title="About Us">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">ABOUT ROOVO</h2>
                <p className="text-slate-500 font-serif italic">Redefining Hospitality, One Stay at a Time.</p>
            </div>

            <div className="notice">
                <p className="mb-0">
                    Roovo is a premier hospitality platform dedicated to connecting travelers with hand-picked, high-quality accommodations across India. From luxury villas to boutique apartments, we ensure every stay is memorable.
                </p>
            </div>

            <h3>Our Mission</h3>
            <p>
                Our mission is to simplify the way people travel by providing a trusted marketplace for premium stays. We believe that everyone deserves a seamless, safe, and comfortable experience when they are away from home.
            </p>

            <h3>What We Offer</h3>
            <p>
                Roovo offers a curated selection of properties that meet our strict standards for quality, safety, and hospitality. We work closely with our Hosts to ensure that every listing provides:
            </p>
            <ul>
                <li><strong>Verified Quality:</strong> Every property is vetted to ensure it meets our high standards.</li>
                <li><strong>Seamless Booking:</strong> An intuitive platform that makes finding and booking your next stay effortless.</li>
                <li><strong>Dedicated Support:</strong> Our team is available 24/7 to assist Guests and Hosts alike.</li>
                <li><strong>Secure Payments:</strong> Robust payment processing ensuring your transactions are always safe.</li>
            </ul>

            <h3>Our Story</h3>
            <p>
                Founded with a passion for travel and technology, Roovo was born out of a desire to bridge the gap between traditional hotels and private vacation rentals. We recognized the need for a platform that combines the comfort of a home with the reliability of a professional hospitality service.
            </p>

            <h3>Company Information</h3>
            <p>
                <strong>Roovo Hospitality Private Limited</strong> is a registered company in India. We are committed to fostering a community built on trust, transparency, and mutual respect.
            </p>

            <div className="important mt-8">
                <p className="mb-0 text-center">
                    <strong>Thank you for choosing Roovo. We look forward to being a part of your next adventure.</strong>
                </p>
            </div>
        </LegalPageLayout>
    );
};

export default AboutUs;

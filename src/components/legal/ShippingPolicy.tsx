import LegalPageLayout from './LegalPageLayout';

const ShippingPolicy = () => {
    return (
        <LegalPageLayout title="Shipping Policy">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">SHIPPING AND DELIVERY POLICY</h2>
                <p className="effective-date">Effective Date: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <div className="notice">
                <p className="mb-0">
                    <strong>NOTICE:</strong> Roovo Hospitality Private Limited operates a digital platform for accommodation booking services. As we do not sell or ship physical goods, traditional shipping policies do not apply to our services.
                </p>
            </div>

            <h3><span className="section-number">1.</span>Nature of Service</h3>
            <p>
                Roovo provides a <strong>digital marketplace platform</strong> that connects property hosts with guests seeking accommodation. Our services are entirely digital and do not involve the physical shipment or delivery of goods. All transactions are for accommodation bookings and related digital services.
            </p>

            <h3><span className="section-number">2.</span>Digital Confirmations and Documents</h3>
            <p>
                Upon successful completion of a booking, you will receive the following digital documents via email:
            </p>
            <ul>
                <li><strong>Booking Confirmation:</strong> Sent immediately upon payment confirmation, containing booking reference number, property details, and reservation dates.</li>
                <li><strong>Digital Booking Voucher:</strong> A PDF document that serves as proof of your reservation.</li>
                <li><strong>Host Contact Information:</strong> Direct contact details for the property host.</li>
                <li><strong>Check-in Instructions:</strong> Detailed arrival and access information, typically sent <span className="highlight">24-48 hours before your scheduled check-in</span>.</li>
                <li><strong>Payment Receipt:</strong> Official receipt for tax and record-keeping purposes.</li>
            </ul>

            <h4>2.1 Delivery of Digital Documents</h4>
            <p>
                All digital documents are delivered <strong>instantly via email</strong> to the email address associated with your Roovo account. Please ensure your email address is correct and check your spam/junk folder if you do not receive confirmation within 15 minutes of booking.
            </p>

            <h3><span className="section-number">3.</span>Physical Items (If Applicable)</h3>
            <p>
                In certain limited circumstances, hosts may provide physical items such as:
            </p>
            <ul>
                <li>Welcome kits or amenity packages</li>
                <li>Property access keys or cards</li>
                <li>Local guides or informational materials</li>
            </ul>

            <div className="important">
                <p className="mb-0">
                    <strong>IMPORTANT DISCLAIMER:</strong> Any physical items provided are delivered directly by the host at the property location. Roovo Hospitality Private Limited is not responsible for the delivery, quality, availability, or condition of such items. Any issues should be addressed directly with the host.
                </p>
            </div>

            <h3><span className="section-number">4.</span>Access to Accommodation</h3>
            <p>
                "Delivery" of our service occurs when you gain access to the booked accommodation at the scheduled check-in time. The host is responsible for ensuring the property is ready and accessible as per the booking agreement.
            </p>

            <h4>4.1 Check-in Process</h4>
            <p>
                Check-in procedures vary by property and may include:
            </p>
            <ul>
                <li>Self check-in with digital lock codes or key boxes</li>
                <li>In-person check-in with the host or property manager</li>
                <li>Key collection from a designated location</li>
            </ul>
            <p>
                Specific check-in instructions will be provided <span className="highlight">24-48 hours before your arrival</span>.
            </p>

            <h3><span className="section-number">5.</span>Issues with Digital Documents</h3>
            <p>
                If you experience any issues receiving your booking confirmation or other digital documents, please contact our support team immediately:
            </p>
            <p>
                <strong>Email:</strong> <a href="mailto:support@roovo.in">support@roovo.in</a><br />
                <strong>Response Time:</strong> Within 2 hours during business hours (9:00 AM - 6:00 PM IST)
            </p>

            <h3><span className="section-number">6.</span>Amendments to This Policy</h3>
            <p>
                Roovo reserves the right to modify this Shipping and Delivery Policy at any time. Any changes will be effective immediately upon posting on our platform. Continued use of our services following such changes constitutes acceptance of the revised policy.
            </p>

            <h3><span className="section-number">7.</span>Contact Information</h3>
            <p>
                For questions or concerns regarding this policy or your booking documents, please contact:
            </p>
            <p>
                <strong>Roovo Hospitality Private Limited</strong><br />
                Email: <a href="mailto:support@roovo.in">support@roovo.in</a><br />
                Customer Support: Available 24/7 for urgent booking-related queries
            </p>

            <div className="notice mt-8">
                <p className="mb-0 text-center">
                    <strong>This policy applies exclusively to services provided through the Roovo platform and does not cover third-party services or products.</strong>
                </p>
            </div>
        </LegalPageLayout>
    );
};

export default ShippingPolicy;

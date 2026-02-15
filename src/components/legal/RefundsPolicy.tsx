import LegalPageLayout from './LegalPageLayout';

const RefundsPolicy = () => {
    return (
        <LegalPageLayout title="Refunds and Cancellation Policy">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">REFUNDS AND CANCELLATION POLICY</h2>
                <p className="effective-date">Effective Date: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <div className="notice">
                <p className="mb-0">
                    This policy outlines the terms and conditions governing cancellations and refunds for bookings made through the Roovo platform. Please read this policy carefully before making a booking.
                </p>
            </div>

            <h3><span className="section-number">1.</span>Cancellation by Guests</h3>

            <h4>1.1 Cancellation Timeframes</h4>
            <p>
                Guests may cancel their booking in accordance with the cancellation policy specified in the listing. Roovo offers three standard cancellation policies, which are set by the Host:
            </p>

            <h4>1.2 Flexible Policy</h4>
            <ul>
                <li><strong>Full refund:</strong> If cancelled at least <span className="highlight">24 hours before check-in</span>.</li>
                <li><strong>50% refund:</strong> If cancelled within 24 hours of check-in but before check-in time.</li>
                <li><strong>No refund:</strong> If cancelled after check-in time or in case of no-show.</li>
            </ul>

            <h4>1.3 Moderate Policy</h4>
            <ul>
                <li><strong>Full refund:</strong> If cancelled at least <span className="highlight">5 days before check-in</span>.</li>
                <li><strong>50% refund:</strong> If cancelled between 5 days and 24 hours before check-in.</li>
                <li><strong>No refund:</strong> If cancelled within 24 hours of check-in or in case of no-show.</li>
            </ul>

            <h4>1.4 Strict Policy</h4>
            <ul>
                <li><strong>Full refund:</strong> If cancelled at least <span className="highlight">14 days before check-in</span>.</li>
                <li><strong>50% refund:</strong> If cancelled between 14 days and 7 days before check-in.</li>
                <li><strong>No refund:</strong> If cancelled within 7 days of check-in or in case of no-show.</li>
            </ul>

            <div className="important">
                <p className="mb-0">
                    <strong>IMPORTANT:</strong> The applicable cancellation policy is clearly displayed on each listing page. Service fees are non-refundable unless the cancellation is made within the full refund period.
                </p>
            </div>

            <h3><span className="section-number">2.</span>Cancellation by Hosts</h3>

            <h4>2.1 Host Cancellation</h4>
            <p>
                If a Host cancels a confirmed booking, the Guest will receive a <strong>full refund</strong> of all amounts paid, including service fees. Additionally:
            </p>
            <ul>
                <li>The Host may be subject to penalties as per our Host Cancellation Policy.</li>
                <li>Roovo will assist the Guest in finding alternative accommodations of equal or better quality, if available.</li>
                <li>The cancelled listing may be temporarily or permanently removed from the platform.</li>
            </ul>

            <h4>2.2 Force Majeure</h4>
            <p>
                In cases of force majeure events (natural disasters, government restrictions, pandemics, etc.), special cancellation terms may apply. Roovo will assess such situations on a case-by-case basis.
            </p>

            <h3><span className="section-number">3.</span>Refund Processing</h3>

            <h4>3.1 Refund Timeline</h4>
            <p>
                Approved refunds will be processed within <span className="highlight">5-7 business days</span> of cancellation approval. The time it takes for the refund to appear in your account depends on your payment method and financial institution:
            </p>
            <ul>
                <li><strong>Credit/Debit Cards:</strong> 5-10 business days</li>
                <li><strong>UPI/Net Banking:</strong> 3-5 business days</li>
                <li><strong>Wallet:</strong> 1-3 business days</li>
            </ul>

            <h4>3.2 Refund Method</h4>
            <p>
                Refunds will be issued to the original payment method used for the booking. In exceptional circumstances, alternative refund methods may be arranged with prior approval from Roovo.
            </p>

            <h3><span className="section-number">4.</span>Modifications to Bookings</h3>
            <p>
                Guests may request modifications to their booking (such as changing dates or number of guests) subject to availability and Host approval. Modification requests are treated as follows:
            </p>
            <ul>
                <li>If the modification results in a lower total price, the difference will be refunded according to the refund timeline.</li>
                <li>If the modification results in a higher total price, the Guest must pay the difference before the modification is confirmed.</li>
                <li>Hosts have the right to decline modification requests.</li>
            </ul>

            <h3><span className="section-number">5.</span>Disputes and Complaints</h3>
            <p>
                If you believe you are entitled to a refund not covered by the standard cancellation policy (e.g., due to property misrepresentation or safety issues), please contact our support team at <a href="mailto:support@roovo.in">support@roovo.in</a> within <span className="highlight">24 hours of check-in</span>.
            </p>
            <p>
                All disputes will be reviewed on a case-by-case basis. Roovo reserves the right to make the final decision regarding refund eligibility.
            </p>

            <h3><span className="section-number">6.</span>Non-Refundable Items</h3>
            <div className="important">
                <p><strong>The following are non-refundable:</strong></p>
                <ul className="mb-0">
                    <li>Service fees (except in cases of Host cancellation or full refund eligibility)</li>
                    <li>Additional services booked separately (e.g., tours, transportation)</li>
                    <li>Bookings cancelled outside the refund eligibility period</li>
                    <li>No-show reservations</li>
                </ul>
            </div>

            <h3><span className="section-number">7.</span>Contact Information</h3>
            <p>
                For questions regarding cancellations or refunds, please contact:
            </p>
            <p>
                <strong>Roovo Hospitality Private Limited</strong><br />
                Email: <a href="mailto:support@roovo.in">support@roovo.in</a><br />
                Phone: +91 7996090696
            </p>

            <div className="notice mt-8">
                <p className="mb-0 text-center">
                    <strong>This policy is subject to change. Any modifications will be communicated to users via email or platform notification.</strong>
                </p>
            </div>
        </LegalPageLayout>
    );
};

export default RefundsPolicy;

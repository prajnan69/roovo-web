import LegalPageLayout from './LegalPageLayout';

const TermsAndConditions = () => {
    return (
        <LegalPageLayout title="Terms and Conditions">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">TERMS AND CONDITIONS OF SERVICE</h2>
                <p className="effective-date">Effective Date: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <div className="important">
                <p className="mb-0"><strong>IMPORTANT NOTICE:</strong> Please read these Terms and Conditions carefully before using our services. By accessing or using the Roovo platform, you agree to be bound by these terms.</p>
            </div>

            <h3><span className="section-number">1.</span>Acceptance of Terms</h3>
            <p>
                These Terms and Conditions ("Terms") constitute a legally binding agreement between you and <strong>Roovo Hospitality Private Limited</strong> ("Roovo", "we", "us", or "our"). By creating an account, making a booking, or otherwise using our platform, you acknowledge that you have read, understood, and agree to be bound by these Terms.
            </p>

            <h3><span className="section-number">2.</span>Definitions</h3>
            <p>For the purposes of these Terms:</p>
            <ul>
                <li><strong>"Platform"</strong> refers to the Roovo website, mobile application, and all related services.</li>
                <li><strong>"Host"</strong> means a property owner or manager who lists accommodations on the Platform.</li>
                <li><strong>"Guest"</strong> means a user who books accommodations through the Platform.</li>
                <li><strong>"Booking"</strong> means a reservation made through the Platform for accommodation services.</li>
                <li><strong>"Listing"</strong> means a property or accommodation advertised on the Platform.</li>
            </ul>

            <h3><span className="section-number">3.</span>Eligibility</h3>
            <p>
                You must be at least <span className="highlight">18 years of age</span> to use our services. By using the Platform, you represent and warrant that you have the legal capacity to enter into a binding contract.
            </p>

            <h3><span className="section-number">4.</span>User Accounts</h3>
            <h4>4.1 Account Registration</h4>
            <p>
                To access certain features of the Platform, you must create an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.
            </p>
            <h4>4.2 Account Security</h4>
            <p>
                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to <span className="highlight">immediately notify Roovo</span> of any unauthorized use of your account.
            </p>

            <h3><span className="section-number">5.</span>Bookings and Payments</h3>
            <h4>5.1 Booking Process</h4>
            <p>
                When you make a booking, you enter into a contract directly with the Host. Roovo acts as a limited agent for the Host in collecting payments.
            </p>
            <h4>5.2 Payment Terms</h4>
            <div className="notice">
                <p className="mb-0">
                    <strong>Payment is due at the time of booking.</strong> All prices are listed in Indian Rupees (INR) and include applicable taxes unless otherwise stated. Payment methods accepted include credit cards, debit cards, UPI, and other payment options as displayed on the Platform.
                </p>
            </div>
            <h4>5.3 Cancellations and Refunds</h4>
            <p>
                Cancellation and refund policies vary by listing and are set by the Host. Please review the specific cancellation policy for each listing before booking. For detailed information, refer to our <strong>Refunds and Cancellation Policy</strong>.
            </p>

            <h3><span className="section-number">6.</span>Host Obligations</h3>
            <p>Hosts agree to:</p>
            <ul>
                <li>Provide accurate and complete information about their listings.</li>
                <li>Honor confirmed bookings and provide the accommodations as described.</li>
                <li>Comply with all applicable laws, regulations, and tax obligations.</li>
                <li>Maintain appropriate insurance coverage for their properties.</li>
                <li>Respond promptly to Guest inquiries and booking requests.</li>
            </ul>

            <h3><span className="section-number">7.</span>Guest Obligations</h3>
            <p>Guests agree to:</p>
            <ul>
                <li>Treat the property with respect and care.</li>
                <li>Comply with all house rules and local laws.</li>
                <li>Leave the property in the condition in which it was found.</li>
                <li>Report any damages or issues to the Host immediately.</li>
                <li>Not exceed the maximum number of guests specified in the listing.</li>
            </ul>

            <h3><span className="section-number">8.</span>Prohibited Activities</h3>
            <div className="important">
                <p><strong>The following activities are strictly prohibited:</strong></p>
                <ul className="mb-0">
                    <li>Using the Platform for any illegal purpose or in violation of any laws.</li>
                    <li>Posting false, inaccurate, misleading, or defamatory content.</li>
                    <li>Engaging in fraudulent activities or impersonating others.</li>
                    <li>Interfering with or disrupting the Platform's operation.</li>
                    <li>Attempting to circumvent payment through the Platform.</li>
                    <li>Discriminating against any person based on race, religion, gender, or other protected characteristics.</li>
                </ul>
            </div>

            <h3><span className="section-number">9.</span>Limitation of Liability</h3>
            <p>
                <strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW</strong>, Roovo shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the Platform or any booking made through the Platform.
            </p>

            <h3><span className="section-number">10.</span>Indemnification</h3>
            <p>
                You agree to indemnify, defend, and hold harmless Roovo and its officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses arising out of or in any way connected with your use of the Platform or violation of these Terms.
            </p>

            <h3><span className="section-number">11.</span>Dispute Resolution</h3>
            <h4>11.1 Governing Law</h4>
            <p>
                These Terms shall be governed by and construed in accordance with the laws of <strong>India</strong>, without regard to its conflict of law provisions.
            </p>
            <h4>11.2 Jurisdiction</h4>
            <p>
                Any disputes arising out of or relating to these Terms shall be subject to the <span className="highlight">exclusive jurisdiction of the courts located in [City], India</span>.
            </p>

            <h3><span className="section-number">12.</span>Modifications to Terms</h3>
            <p>
                Roovo reserves the right to modify these Terms at any time. We will notify users of material changes via email or through a notice on the Platform. Your continued use of the Platform after such modifications constitutes acceptance of the updated Terms.
            </p>

            <h3><span className="section-number">13.</span>Contact Information</h3>
            <p>
                For questions or concerns regarding these Terms, please contact us at:
            </p>
            <p>
                <strong>Roovo Hospitality Private Limited</strong><br />
                Email: <a href="mailto:contact@roovo.in">contact@roovo.in</a><br />
                Support: <a href="mailto:support@roovo.in">support@roovo.in</a>
            </p>

            <div className="notice mt-8">
                <p className="mb-0 text-center">
                    <strong>By using the Roovo platform, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.</strong>
                </p>
            </div>
        </LegalPageLayout>
    );
};

export default TermsAndConditions;

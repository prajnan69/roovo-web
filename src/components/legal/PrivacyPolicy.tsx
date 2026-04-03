import LegalPageLayout from './LegalPageLayout';

const PrivacyPolicy = () => {
    return (
        <LegalPageLayout title="Privacy Policy">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">PRIVACY POLICY</h2>
                <p className="effective-date">Effective Date: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <div className="notice">
                <p className="mb-0">
                    At Roovo, we value your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our platform.
                </p>
            </div>

            <h3><span className="section-number">1.</span>Information We Collect</h3>
            <p>
                We collect information that you provide directly to us, as well as information collected automatically when you use our Platform.
            </p>

            <h4>1.1 Personal Information</h4>
            <p>
                When you register for an account or make a booking, we may collect:
            </p>
            <ul>
                <li><strong>Contact Information:</strong> Name, email address, phone number, and postal address.</li>
                <li><strong>Identity Information:</strong> Government-issued ID (when required for verification).</li>
                <li><strong>Payment Information:</strong> Credit/debit card details (processed securely via our payment partners).</li>
                <li><strong>Profile Information:</strong> Profile picture, preferences, and feedback.</li>
            </ul>

            <h4>1.2 Usage and Technical Data</h4>
            <p>
                When you access our Platform, we automatically collect:
            </p>
            <ul>
                <li><strong>Log Data:</strong> IP address, browser type, operating system, and pages visited.</li>
                <li><strong>Location Data:</strong> Precise or approximate location if you enable location services.</li>
                <li><strong>Device Information:</strong> Device ID, model, and settings.</li>
                <li><strong>Cookies:</strong> We use cookies and similar technologies to enhance your experience.</li>
            </ul>

            <h3><span className="section-number">2.</span>How We Use Your Information</h3>
            <p>We use the collected information for various purposes, including:</p>
            <ul>
                <li>Providing and managing your bookings and account.</li>
                <li>Processing payments and preventing fraud.</li>
                <li>Communicating with you regarding bookings, updates, and support.</li>
                <li>Personalizing your experience and improving our Platform.</li>
                <li>Complying with legal obligations and resolving disputes.</li>
                <li>Sending promotional materials (with your consent).</li>
            </ul>

            <h3><span className="section-number">3.</span>Information Sharing and Disclosure</h3>
            <div className="important">
                <p><strong>We do not sell your personal information to third parties.</strong> We may share your data with:</p>
                <ul className="mb-0">
                    <li><strong>Hosts:</strong> To facilitate your booking and provide necessary services.</li>
                    <li><strong>Service Providers:</strong> Third-party vendors who assist with payments, analytics, and marketing.</li>
                    <li><strong>Legal Authorities:</strong> When required by law or to protect our rights and safety.</li>
                    <li><strong>Business Transfers:</strong> In connection with a merger, sale, or acquisition.</li>
                </ul>
            </div>

            <h3><span className="section-number">4.</span>Data Security</h3>
            <p>
                We implement robust security measures, including <span className="highlight">encryption and secure servers</span>, to protect your personal information. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
            </p>

            <h3><span className="section-number">5.</span>Your Rights and Choices</h3>
            <p>You have certain rights regarding your personal data, subject to local laws:</p>
            <ul>
                <li><strong>Access and Update:</strong> You can review and update your account information at any time.</li>
                <li><strong>Data Deletion:</strong> You may request the deletion of your personal data, subject to certain legal requirements.</li>
                <li><strong>Marketing Preferences:</strong> You can opt-out of receiving promotional emails by following the unsubscribe instructions.</li>
                <li><strong>Cookies:</strong> Most browsers allow you to manage cookie settings.</li>
            </ul>

            <h3><span className="section-number">6.</span>Children's Privacy</h3>
            <p>
                Our Platform is not intended for individuals under the age of 18. We do not knowingly collect personal information from children.
            </p>

            <h3><span className="section-number">7.</span>Changes to This Policy</h3>
            <p>
                We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated effective date. We encourage you to review this policy periodically.
            </p>

            <h3><span className="section-number">8.</span>Contact Us</h3>
            <p>
                If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:
            </p>
            <p>
                <strong>Roovo Hospitality Private Limited</strong><br />
                Email: <a href="mailto:privacy@roovo.in">privacy@roovo.in</a><br />
                Support: <a href="mailto:support@roovo.in">support@roovo.in</a>
            </p>

            <div className="notice mt-8">
                <p className="mb-0 text-center">
                    <strong>By using the Roovo platform, you consent to the collection and use of your information as described in this Privacy Policy.</strong>
                </p>
            </div>
        </LegalPageLayout>
    );
};

export default PrivacyPolicy;

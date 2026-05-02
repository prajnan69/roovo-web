import LegalPageLayout from './LegalPageLayout';

const BookingFlow = () => {
    return (
        <LegalPageLayout title="Service Purchase Flow">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">HOW TO BOOK ON ROOVO</h2>
                <p className="text-slate-500 font-serif italic">A simple, secure process for your peace of mind.</p>
            </div>

            <div className="notice">
                <p className="mb-0">
                    Booking your perfect stay on Roovo is designed to be straightforward and secure. Follow the steps below to complete your reservation.
                </p>
            </div>

            <h3>Step 1: Search & Discover</h3>
            <p>
                Browse our curated listings on the home page or use the search bar to find properties in your desired location. You can filter by property type, number of guests, and amenities to find the perfect match.
            </p>

            <h3>Step 2: Review Details</h3>
            <p>
                Click on a listing to view detailed information, including high-resolution photos, descriptions, amenities, house rules, and the Host's profile. You can also see ratings and reviews from previous Guests.
            </p>

            <h3>Step 3: Select Dates & Guests</h3>
            <p>
                Once you've found a property you like, use the calendar to select your check-in and check-out dates. Enter the number of guests to see the total price, including any service fees and taxes.
            </p>

            <h3>Step 4: Confirm & Pay</h3>
            <p>
                Review your booking summary and click on "Book Now" or "Confirm and Pay". You will be directed to our secure payment gateway where you can choose from various payment methods:
            </p>
            <ul>
                <li><strong>UPI:</strong> Instant payment via any UPI app.</li>
                <li><strong>Cards:</strong> All major Credit and Debit cards (Visa, Mastercard, RuPay).</li>
                <li><strong>Net Banking:</strong> Secure transfer from all major Indian banks.</li>
                <li><strong>Wallets:</strong> Popular mobile wallets.</li>
            </ul>

            <h3>Step 5: Instant Confirmation</h3>
            <div className="important">
                <p className="mb-0">
                    <strong>Upon successful payment, your booking is instantly confirmed.</strong> You will receive a confirmation email and WhatsApp message with the property address, Host contact details, and check-in instructions.
                </p>
            </div>

            <h3>Step 6: Stay & Enjoy</h3>
            <p>
                Check in at the scheduled time and enjoy your stay! Our support team and your Host are available if you need any assistance during your stay.
            </p>

            <div className="notice mt-8">
                <p className="mb-0 text-center">
                    <strong>Ready to start? Find your next stay on our <a href="/">home page</a>.</strong>
                </p>
            </div>
        </LegalPageLayout>
    );
};

export default BookingFlow;

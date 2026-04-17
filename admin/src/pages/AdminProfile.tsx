import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, type ApiClientError } from '../services/api';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export default function AdminProfile() {
  const { user, refreshUser, setUser } = useAuth();

  const [detailsForm, setDetailsForm] = useState({
    firstName: '',
    lastName: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingImage, setSavingImage] = useState(false);

  const [detailsError, setDetailsError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [imageError, setImageError] = useState('');

  const [detailsSuccess, setDetailsSuccess] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [imageSuccess, setImageSuccess] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      setLoadingProfile(true);
      try {
        await refreshUser();
      } catch (err) {
        const apiError = err as ApiClientError;
        setDetailsError(apiError.message || 'Failed to load profile details');
      } finally {
        setLoadingProfile(false);
      }
    };

    if (!user) {
      void loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;

    setDetailsForm({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
    });
  }, [user]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const activeImageUrl = useMemo(() => {
    if (imagePreviewUrl) return imagePreviewUrl;
    return user?.profileImageUrl ?? '';
  }, [imagePreviewUrl, user?.profileImageUrl]);

  const handleDetailsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDetailsError('');
    setDetailsSuccess('');

    if (!detailsForm.firstName.trim() || !detailsForm.lastName.trim()) {
      setDetailsError('First name and last name are required');
      return;
    }

    setSavingDetails(true);
    try {
      const updatedUser = await api.updateMe({
        firstName: detailsForm.firstName.trim(),
        lastName: detailsForm.lastName.trim(),
      });
      setUser(updatedUser);
      setDetailsSuccess('Profile details updated successfully');
    } catch (err) {
      const apiError = err as ApiClientError;
      setDetailsError(apiError.message || 'Failed to update profile details');
    } finally {
      setSavingDetails(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('All password fields are required');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirm password do not match');
      return;
    }

    setSavingPassword(true);
    try {
      await api.changeMyPassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordSuccess('Password changed successfully');
    } catch (err) {
      const apiError = err as ApiClientError;
      setPasswordError(apiError.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    setImageError('');
    setImageSuccess('');

    const file = event.target.files?.[0];
    if (!file) {
      setSelectedImage(null);
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setSelectedImage(null);
      event.target.value = '';
      setImageError('Please select a valid image file (JPG, PNG, WEBP, HEIC, HEIF)');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setSelectedImage(null);
      event.target.value = '';
      setImageError('Image size must be less than 5MB');
      return;
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
    setSelectedImage(file);
  };

  const handleImageSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setImageError('');
    setImageSuccess('');

    if (!selectedImage) {
      setImageError('Please select an image first');
      return;
    }

    setSavingImage(true);
    try {
      const response = await api.uploadMyProfileImage(selectedImage);
      if (user) {
        setUser({
          ...user,
          profileImageUrl: response.profileImageUrl ?? user.profileImageUrl,
        });
      }
      setSelectedImage(null);
      setImagePreviewUrl('');
      setImageSuccess('Profile image updated successfully');
    } catch (err) {
      const apiError = err as ApiClientError;
      setImageError(apiError.message || 'Failed to update profile image');
    } finally {
      setSavingImage(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto thin-scrollbar p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <section>
          <p className="font-label text-xs uppercase tracking-[0.15em] text-on-surface-variant mb-1">Admin User Management</p>
          <h1 className="font-headline text-3xl font-extrabold text-on-surface">My Account Settings</h1>
          <p className="text-sm text-on-surface-variant mt-2">Update your profile details, change password, and upload a new profile image.</p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-6 lg:col-span-1">
            <h2 className="font-headline text-lg font-bold text-on-surface mb-4">Profile Image</h2>
            <div className="flex flex-col items-center gap-4">
              {activeImageUrl ? (
                <img
                  src={activeImageUrl}
                  alt="Admin profile"
                  className="w-28 h-28 rounded-full object-cover border border-outline-variant/30"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant">person</span>
                </div>
              )}

              <form className="w-full space-y-3" onSubmit={(event) => void handleImageSubmit(event)}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="focus-ring-control block w-full text-xs text-on-surface-variant file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-outline-variant/40 file:bg-surface-container-low file:text-on-surface file:text-xs file:font-medium"
                />
                <button
                  type="submit"
                  disabled={savingImage || loadingProfile}
                  className="w-full px-4 py-2.5 rounded-md bg-primary text-on-primary text-sm font-semibold hover:brightness-110 transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:cursor-not-allowed"
                >
                  {savingImage ? 'Uploading...' : 'Update Image'}
                </button>
                {imageError && <p className="text-xs text-error">{imageError}</p>}
                {imageSuccess && <p className="text-xs text-tertiary-dim">{imageSuccess}</p>}
              </form>
            </div>
          </section>

          <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-6 lg:col-span-2">
            <h2 className="font-headline text-lg font-bold text-on-surface mb-4">Profile Details</h2>
            <form className="space-y-4" onSubmit={(event) => void handleDetailsSubmit(event)}>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-[0.1em] text-on-surface-variant">Email</span>
                <input
                  type="email"
                  value={user?.email ?? ''}
                  className="focus-ring-control px-3 py-2.5 border border-outline-variant/40 rounded-md bg-surface text-sm text-on-surface"
                  readOnly
                  disabled={loadingProfile}
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs uppercase tracking-[0.1em] text-on-surface-variant">First Name</span>
                  <input
                    type="text"
                    value={detailsForm.firstName}
                    onChange={(event) => setDetailsForm((current) => ({ ...current, firstName: event.target.value }))}
                    className="focus-ring-control px-3 py-2.5 border border-outline-variant/40 rounded-md bg-surface text-sm text-on-surface"
                    disabled={savingDetails || loadingProfile}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs uppercase tracking-[0.1em] text-on-surface-variant">Last Name</span>
                  <input
                    type="text"
                    value={detailsForm.lastName}
                    onChange={(event) => setDetailsForm((current) => ({ ...current, lastName: event.target.value }))}
                    className="focus-ring-control px-3 py-2.5 border border-outline-variant/40 rounded-md bg-surface text-sm text-on-surface"
                    disabled={savingDetails || loadingProfile}
                    required
                  />
                </label>
              </div>

              {detailsError && <p className="text-sm text-error">{detailsError}</p>}
              {detailsSuccess && <p className="text-sm text-tertiary-dim">{detailsSuccess}</p>}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingDetails || loadingProfile}
                  className="px-4 py-2.5 rounded-md bg-primary text-on-primary text-sm font-semibold hover:brightness-110 transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:cursor-not-allowed"
                >
                  {savingDetails ? 'Saving...' : 'Update Details'}
                </button>
              </div>
            </form>
          </section>
        </div>

        <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-6">
          <h2 className="font-headline text-lg font-bold text-on-surface mb-4">Change Password</h2>
          <form className="space-y-4" onSubmit={(event) => void handlePasswordSubmit(event)}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-[0.1em] text-on-surface-variant">Current Password</span>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                  className="focus-ring-control px-3 py-2.5 border border-outline-variant/40 rounded-md bg-surface text-sm text-on-surface"
                  disabled={savingPassword || loadingProfile}
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-[0.1em] text-on-surface-variant">New Password</span>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                  className="focus-ring-control px-3 py-2.5 border border-outline-variant/40 rounded-md bg-surface text-sm text-on-surface"
                  disabled={savingPassword || loadingProfile}
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-[0.1em] text-on-surface-variant">Confirm Password</span>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                  className="focus-ring-control px-3 py-2.5 border border-outline-variant/40 rounded-md bg-surface text-sm text-on-surface"
                  disabled={savingPassword || loadingProfile}
                  required
                />
              </label>
            </div>

            {passwordError && <p className="text-sm text-error">{passwordError}</p>}
            {passwordSuccess && <p className="text-sm text-tertiary-dim">{passwordSuccess}</p>}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingPassword || loadingProfile}
                className="px-4 py-2.5 rounded-md bg-primary text-on-primary text-sm font-semibold hover:brightness-110 transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:cursor-not-allowed"
              >
                {savingPassword ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

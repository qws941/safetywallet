"use client";

import Image from "next/image";
import { useTranslation } from "@/hooks/use-translation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@safetywallet/ui";
import { ActionImageDto } from "@safetywallet/types";
import { Upload, Trash2 } from "lucide-react";

interface ActionImageGalleryProps {
  title: string;
  images: ActionImageDto[];
  onUploadClick: () => void;
  isUploading: boolean;
  onDeleteImage: (id: string) => void;
  emptyMessage: string;
  imageAlt: string;
}

export function ActionImageGallery({
  title,
  images,
  onUploadClick,
  isUploading,
  onDeleteImage,
  emptyMessage,
  imageAlt,
}: ActionImageGalleryProps) {
  const t = useTranslation();

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onUploadClick}
          disabled={isUploading}
        >
          <Upload className="w-4 h-4 mr-1" />
          {t("actions.view.upload")}
        </Button>
      </CardHeader>
      <CardContent>
        {images.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {images.map((img) => (
              <div key={img.id} className="relative group">
                <Image
                  src={img.fileUrl}
                  alt={imageAlt}
                  width={512}
                  height={256}
                  className="w-full h-32 object-cover rounded-md"
                  unoptimized
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t("actions.view.deletePhoto")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("actions.view.confirmDelete")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>
                        {t("actions.view.cancel")}
                      </AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDeleteImage(img.id)}>
                        {t("actions.view.delete")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg text-muted-foreground text-sm">
            {emptyMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
